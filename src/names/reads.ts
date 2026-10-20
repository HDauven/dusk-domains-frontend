import * as sdk from '@duskdomains/sdk'
import type { DuskConnectAppLike, DuskDomainContractMap } from './commands'
import type {
  DuskDomainsOnChainClient,
  DuskDomainsOnChainClientOptions,
  DuskDomainsOnChainReadTransport,
  DuskDomainsOnChainRecord,
  DuskDomainsOnChainNameResponse,
} from './readTypes'
import type { DuskDomainsMarketplaceOnChainClient, MarketplaceOrderIdentity } from './marketTypes'
import { createDuskDomainsIndexerClient } from './http/client'
import { DEFAULT_FEE_CONFIG } from './ui/names'
import { REGISTRATIONS_CLOSED_MESSAGE } from './ui/errors'
import { getRecordDefinition, type ResolverRecordKey } from './ui/records'
import { namehashHex } from './hash'
import { safeNumber } from './numbers'
import { success, failure } from './http/resultHelpers'
import { listPendingNameReservations } from './reservations'
import { PrimaryTargetError, primaryLinks, primaryTarget, type PrimaryLink } from './primaryLinks'
import { retryReadRace } from './readRace'
/**
 * The store an indexer row names as a name's home (`homeShard`), as a hint where to read it first. A
 * hint is only where to look: a wrong one costs reads, never the answer, and a malformed one is none.
 */
export function homeHint(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined
}
export function contractIdFromOutput(value: unknown): string | null {
  try {
    return '0x' + sdk.contractId(value as string | number[])
  } catch {
    return null
  }
}
// An unsigned price preview needs a nonzero actor. Connected quotes always use the wallet authority.
export const PREVIEW_QUOTE_ACTOR = '0x' + '01'.repeat(32)
export const endpointBytes = (account: string) => {
  const p = sdk.typedPrincipalFromWalletAccount(account)
  if (!p.ok || p.principal.kind !== 'Moonlight') throw new Error('Enter a valid public Dusk address.')
  return p.principal.bytes
}
function textOrHex(value: number[]): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(value))
  } catch {
    return '0x' + sdk.hex(value)
  }
}
export function recordView(r: sdk.RecordValue): DuskDomainsOnChainRecord {
  const value =
    r.key === 'moonlight_address'
      ? sdk.encodeBase58(r.value)
      : r.key === 'dusk_contract'
        ? '0x' + sdk.hex(r.value)
        : textOrHex(r.value)
  const key = r.key as ResolverRecordKey
  return {
    key,
    value,
    ttlSeconds: safeNumber(r.ttl_seconds),
    updatedAtBlock: safeNumber(r.updated_at),
    visibility: getRecordDefinition(key)?.visibility ?? 'public',
  }
}
export function local<T>(value: sdk.Located<T>): T | null {
  return typeof value === 'object' && 'Local' in value ? value.Local : null
}
export async function requireName(client: sdk.FrozenClient, spelling: string) {
  return requiredName(await client.getName(spelling))
}
function requiredName(located: sdk.Routed<sdk.NameView>) {
  const view = local(located.value)
  if (!view) throw new Error('This name is no longer registered. Refresh and try again.')
  return { ...located, view, ref: { key: view.name.key, incarnation: view.name.incarnation } }
}
/**
 * The directory's registration context, refused while registrations are paused or the policy is
 * suspended. The store would refuse a quote or commit with Closed then, and Rusk answers that
 * read-only trap with HTTP 500, so the store is never asked.
 */
export async function openRegistrationContext(client: sdk.FrozenClient) {
  const context = await client.directory.registration_context()
  if (context.operator_paused || context.guardian_suspended) throw new Error(REGISTRATIONS_CLOSED_MESSAGE)
  return context
}
/**
 * A registration quote to show, from the store the chain would register the name at. It is for display
 * only: Register quotes again with `prepareRegistration` and signs that quote alone. `homeHint`, a
 * released root's home, is where the preview looks first.
 */
export async function registrationQuote(
  client: sdk.FrozenClient,
  spelling: string,
  years: number,
  actor: string,
  homeHint?: string,
) {
  await openRegistrationContext(client)
  return client.previewRegistration({ label: spelling.split('.').at(-2)!, years, actor: sdk.fromHex(actor, 32) }, homeHint)
}
export async function registrationRegistry(
  app: DuskConnectAppLike,
  _contracts: DuskDomainContractMap,
  name: string,
): Promise<string> {
  const client = app.client
  if (!client) throw new Error('Frozen client unavailable')
  return (await (await client).registrationPlacement(sdk.nameKey(name).root)).store
}
export function createDuskDomainsOnChainReadTransport(
  app: DuskConnectAppLike,
  _contracts: DuskDomainContractMap,
): DuskDomainsOnChainReadTransport {
  return {
    // Asked for on every read: once creation recovers from a failure, the next read uses the new client.
    get client() {
      return app.client
    },
    isCurrentClient: (client) => app.isCurrentClient?.(client) ?? true,
    read: (call) =>
      app.readContract({
        contract: _contracts[call.contract]!,
        functionName: call.functionName,
        args: call.args,
      }),
  }
}
type Kept<T> = { client: sdk.FrozenClient; read: Promise<T> }
async function wrapped<T>(read: () => Promise<T>) {
  try {
    return success(await retryReadRace(read))
  } catch (e) {
    return failure<T>('contract_read_failed', e instanceof Error ? e.message : String(e))
  }
}
export function createDuskDomainsOnChainClient(
  options: DuskDomainsOnChainClientOptions,
): DuskDomainsOnChainClient {
  const getClient = async () => {
    const client = options.read.client
    if (!client) throw new Error('Frozen client unavailable')
    return client
  }
  const names = new Map<string, string>()
  // One name read per name and height, shared by the parts of a page: its state, records, renewal
  // quote and owner checks. A name page reads the name with everything else it shows, and the other
  // parts take the name from that read. A caller reuses a read only when it was taken at the tip this
  // caller reads after asking, or later, so no caller sees a name older than the chain when it asked.
  const nameReads = new Map<string, Kept<sdk.Routed<sdk.NameView>>>()
  // The page each name's page read returned last, which prices the renewal that page shows.
  const pages = new Map<string, Kept<sdk.NamePage>>()
  const keep = <T>(reads: Map<string, Kept<T>>, c: sdk.FrozenClient, spelling: string, read: Promise<T>) => {
    reads.delete(spelling)
    reads.set(spelling, { client: c, read })
    if (reads.size > 64) reads.delete(reads.keys().next().value!)
    read.catch(() => { if (reads.get(spelling)?.read === read) reads.delete(spelling) })
  }
  const readName = async (c: sdk.FrozenClient, spelling: string, hint?: string): Promise<sdk.Routed<sdk.NameView>> => {
    const earlier = nameReads.get(spelling)
    if (earlier?.client === c) {
      const [tip, routed] = await Promise.all([c.transport.currentBlockHeight(), earlier.read.catch(() => null)])
      if (routed && routed.height >= BigInt(tip)) return structuredClone(routed)
    }
    const read = c.getName(spelling, hint)
    keep(nameReads, c, spelling, read)
    return structuredClone(await read)
  }
  const readPage = async (c: sdk.FrozenClient, spelling: string, hint?: string) => {
    const page = c.namePage(spelling, hint)
    keep(nameReads, c, spelling, page.then(({ store, value, forwards, height }) => ({ store, value, forwards, height })))
    keep(pages, c, spelling, page)
    return page
  }
  // A renewal price to show. For a name whose page was read, it is what the store quotes at the page's
  // height: computed from the page without a read where the SDK can, quoted directly elsewhere, and
  // refused, as the store would, for a term past the page's horizon. Other names are quoted directly.
  // Renew quotes again directly and signs only that quote.
  const renewalQuote = async (c: sdk.FrozenClient, spelling: string, years: number, hint?: string) => {
    const shown = pages.get(spelling),
      page = shown?.client === c ? await shown.read.catch(() => null) : null
    const n = requiredName(page ?? (await readName(c, spelling, hint)))
    if (page?.renewal && years > page.renewal.max_years)
      throw new Error('A name can run at most 10 years ahead, so this term isn’t available now.')
    const quote = page ? await c.previewRenewal(page, years) : await c.quoteRenewal(n.store, { name: n.ref, years })
    const v = local(quote.value)
    if (!v) throw new Error('Renewal unavailable')
    return { ...quote, quote: v, ref: structuredClone(n.ref) }
  }
  const byNode = async (node: string) => {
    const c = await getClient()
    const known = names.get(node.toLowerCase())
    if (known) return known
    const indexed = await createDuskDomainsIndexerClient({
      baseUrl: c.release.manifest.indexerUrl,
    }).getNameState(node)
    if (!indexed?.canonicalName || namehashHex(indexed.canonicalName) !== node.toLowerCase())
      throw new Error('Name spelling unavailable')
    return indexed.canonicalName
  }
  const nameResponse = (name: string, located: sdk.Routed<sdk.NameView>): DuskDomainsOnChainNameResponse => {
    const v = local(located.value)
    names.set(namehashHex(name), name)
    return {
      canonicalName: name,
      node: namehashHex(name),
      marketplaceTransferable: name.split('.').length === 2,
      store: located.store,
      ref: v ? { key: v.name.key, incarnation: v.name.incarnation } : null,
      record: v
        ? {
            label: v.name.label,
            owner: '0x' + sdk.hex(v.name.owner),
            manager: '0x' + sdk.hex(v.name.manager),
            lifecycle: {
              expiresAtBlock: safeNumber(v.name.expires_at),
              graceEndsAtBlock: safeNumber(v.name.grace_end),
            },
            referrer: v.name.referrer,
          }
        : null,
    }
  }
  const getName = async (spelling: string, hint?: string): Promise<DuskDomainsOnChainNameResponse> => {
    const c = await getClient(),
      name = sdk.normalizeNameInput(spelling)
    return nameResponse(name, await readName(c, name, hint))
  }
  const records = async (spelling: string, keys?: string[]) => {
    const c = await getClient(),
      name = requiredName(await readName(c, sdk.normalizeNameInput(spelling)))
    // The store resolves the registry-qualified slot through its admitted resolver.
    const r = await c.locate<sdk.RecordsView>(
      name.store,
      name.ref.key.root,
      'read_records',
      name.ref.key,
    )
    return (local(r.value)?.records ?? []).map(recordView).filter((r) => !keys || keys.includes(r.key))
  }
  const linkView = ({ store, view }: PrimaryLink) => ({
    store,
    node: '0x' + sdk.hex(view.primary.name.key.node),
    name: view.spelling,
    mappingId: String(view.primary.mapping_id),
    updatedAtBlock: safeNumber(view.primary.updated_at),
  })
  // Every store's stored link for the address, in admission order, as set_primary's uniqueness check reads them.
  const storedPrimaryLinks = async (endpoint: import('./http/results').DuskEndpoint) =>
    (await primaryLinks(await getClient(), endpointBytes(endpoint.value))).map(linkView)
  const primaryView = (endpoint: import('./http/results').DuskEndpoint, v: sdk.VerifiedPrimary) => ({
    endpoint,
    primaryName: v.primary.spelling,
    node: '0x' + sdk.hex(v.primary.primary.name.key.node),
    forwardRecord: recordView(v.record),
    verified: true as const,
  })
  // The store's authority-gated resolution, with incarnation, lifecycle and forward record checked. The
  // store a hint names, the one keeping the mapping, is asked first: one it verifies is the pool's only one.
  const primary = async (endpoint: import('./http/results').DuskEndpoint, hint?: string) => {
    if (endpoint.type !== 'moonlight_address')
      throw new Error('Only public Dusk addresses support primary names.')
    const v = await (await getClient()).verifyPrimary(endpointBytes(endpoint.value), hint)
    return v ? primaryView(endpoint, v) : null
  }
  // What a name's page shows, at one height: the name, every record and the verified primary of its own
  // Dusk address record. The page's other parts then take the name from this read.
  const namePage = async (spelling: string, hint?: string) => {
    const c = await getClient(),
      name = sdk.normalizeNameInput(spelling),
      page = await readPage(c, name, hint)
    const verified = page.primary.verified
    return {
      name: nameResponse(name, page),
      records: (page.records?.records ?? []).map(recordView),
      primaryName: verified ? verified.primary.spelling : null,
      primaryError: page.primary.error ? (page.primary.error instanceof Error ? page.primary.error.message : String(page.primary.error)) : null,
    }
  }
  return {
    getCurrentBlockHeight: () =>
      wrapped(async () => safeNumber(await (await getClient()).transport.currentBlockHeight())),
    getName: (name, hint) => wrapped(() => getName(name, hint)),
    getNamePage: (name, hint) => wrapped(() => namePage(name, hint)),
    getNameByNode: (node) => wrapped(async () => getName(await byNode(node))),
    getNameOwner: (name) =>
      wrapped(async () => {
        const n = await getName(name)
        if (!n.record) throw new Error('Name is absent')
        return n.record.owner
      }),
    getRecords: (name, keys) => wrapped(() => records(name, keys)),
    getRecord: (name, key) =>
      wrapped(async () => {
        const r = (await records(name, [key]))[0]
        if (!r) throw new Error('Record is missing')
        return r
      }),
    resolveName: (name, key = 'moonlight_address') =>
      wrapped(async () => {
        // The name at its home with that record, at one height.
        const resolved = await (await getClient()).resolve(sdk.normalizeNameInput(name), [key])
        if (!local(resolved.value)) throw new Error('This name is no longer registered. Refresh and try again.')
        const raw = resolved.records[0]
        if (!raw) throw new Error('Record is missing or the name is inactive')
        const r = recordView(raw)
        return {
          canonicalName: sdk.normalizeNameInput(name),
          node: namehashHex(sdk.normalizeNameInput(name)),
          endpoint: { type: r.key, value: r.value },
          record: r,
        }
      }),
    getPrimaryName: (endpoint, hint) => wrapped(async () => (await primary(endpoint, hint))?.primaryName ?? null),
    verifyPrimaryName: (endpoint, expectedName, hint) =>
      wrapped(async () => {
        const p = await primary(endpoint, hint)
        if (!p) throw new Error('No resolved primary name')
        if (expectedName && expectedName !== p.primaryName) throw new Error('Primary name mismatch')
        return p
      }),
    readPrimaryLinks: (endpoint) => wrapped(async () => storedPrimaryLinks(endpoint)),
    checkPrimaryTarget: async (name, address) => {
      try {
        const target = await retryReadRace(async () =>
          primaryTarget(await getClient(), sdk.normalizeNameInput(name), endpointBytes(address)))
        return success({ store: target.store, nameRef: target.ref, links: target.links.map(linkView) })
      } catch (e) {
        return failure(e instanceof PrimaryTargetError ? 'not_primary_eligible' : 'contract_read_failed', e instanceof Error ? e.message : String(e))
      }
    },
    readPrimaryName: (endpoint) =>
      wrapped(async () => {
        const link = (await storedPrimaryLinks(endpoint))[0]
        return link ? { endpoint, ...link } : null
      }),
    getPendingCommitment: (controller, commitment) =>
      wrapped(async () => {
        const c = await getClient(),
          saved = listPendingNameReservations({
            chainId: c.release.manifest.chainId,
            directory: c.directoryId,
            controller,
          }).find((r) => r.commitment === commitment)
        if (!saved) throw new Error('Original commitment store unavailable. Open the saved reservation.')
        const p = await c
          .store(saved.commitmentStore)
          .pending_commitment({ actor: sdk.fromHex(controller, 32), hash: sdk.fromHex(commitment, 32) })
        return {
          commitment,
          pending: p ? { controller, createdAtBlock: safeNumber(p.created_at) } : null,
        }
      }),
    getRegistrationPremium: (name, hint) =>
      wrapped(async () =>
        safeNumber(
          (await registrationQuote(await getClient(), name, 1, PREVIEW_QUOTE_ACTOR, hint)).quote.quote
            .premium_lux,
        ),
      ),
    getRegistrationQuote: (name, years, actor, hint) =>
      wrapped(async () => registrationQuote(await getClient(), name, years, actor, hint)),
    getRenewalQuote: (name, years, hint) =>
      wrapped(async () => renewalQuote(await getClient(), sdk.normalizeNameInput(name), years, hint)),
    getFeeConfig: () =>
      wrapped(async () => {
        const c = await getClient(),
          context = await c.directory.registration_context(),
          p = await c.policy(sdk.contractId(context.policy)).config(),
          renewal = await c.directory.renewal_schedule()
        return {
          ...DEFAULT_FEE_CONFIG,
          threeCharYearLux: safeNumber(p.annual_lux[2]),
          fourCharYearLux: safeNumber(p.annual_lux[3]),
          fivePlusYearLux: safeNumber(p.annual_lux[4]),
          referralRewardBps: p.base_referral_bps,
          premiumStartLux: safeNumber(p.premium_start_lux),
          premiumReferralRewardBps: p.premium_referral_bps,
          renewalReferralRewardBps: renewal.referral_bps,
          version: safeNumber(context.policy_version),
        }
      }),
  }
}
export function createDuskDomainsMarketplaceOnChainClient(
  read: DuskDomainsOnChainReadTransport,
): DuskDomainsMarketplaceOnChainClient {
  const client = async () => {
    const current = read.client
    if (!current) throw new Error('Frozen client unavailable')
    return current
  }
  const order = async (node: string, buyer?: string, identity?: MarketplaceOrderIdentity) => {
    if (identity) {
      const c = await client(),
        expected = identity.order.terms
      if (
        namehashHex(identity.name) !== node.toLowerCase() ||
        '0x' + sdk.hex(expected.name.key.node) !== node.toLowerCase() ||
        sdk.contractId(expected.directory) !== c.directoryId
      )
        throw new Error('Order identity does not match this name or deployment')
      const marketId = sdk.contractId(identity.marketplaceContractId)
      const o = await c.marketplace(marketId).read_order({ id: expected.id })
      if (
        o &&
        (sdk.stringifyJson(o.terms) !== sdk.stringifyJson(expected) ||
          o.nonce !== identity.order.nonce ||
          o.status !== identity.order.status ||
          (buyer && (!o.terms.buyer || sdk.hex(o.terms.buyer) !== sdk.hex(sdk.fromHex(buyer, 32)))))
      )
        throw new Error(
          'Marketplace state changed on-chain. Review the latest terms before trying again.',
        )
      return { o, name: identity.name }
    }
    // Without an order's identity only the buyer's offer slot in the preferred market is read, the
    // market a new offer goes to. An existing order is always read at the market it records.
    if (!buyer) throw new Error('The recorded marketplace and order are required')
    const c = await client(),
      indexed = await createDuskDomainsIndexerClient({
        baseUrl: c.release.manifest.indexerUrl,
      }).getNameState(node)
    if (!indexed?.canonicalName || namehashHex(indexed.canonicalName) !== node.toLowerCase())
      throw new Error('Name spelling unavailable')
    const n = await c.getName(indexed.canonicalName, homeHint(indexed.homeShard)),
      config = await c.directory.config()
    if (!config.preferred_marketplace) throw new Error('Marketplace unavailable')
    const market = c.marketplace(sdk.contractId(config.preferred_marketplace))
    const key = { store: sdk.fromHex(n.store, 32), root: sdk.nameKey(indexed.canonicalName).root }
    const o = await market.read_offer({ ...key, buyer: sdk.fromHex(buyer, 32) })
    return { o, name: indexed.canonicalName }
  }
  return {
    getFixedSale: (node, identity) =>
      wrapped(async () => {
        const { o, name } = await order(node, undefined, identity)
        if (!o || o.terms.kind !== 'Fixed') return null
        const t = o.terms
        return {
          order: o,
          saleId: safeNumber(t.id),
          feeBps: t.fee_bps,
          openedAtBlockHeight: 0,
          node,
          name,
          sellerAuthority: '0x' + sdk.hex(t.seller),
          priceLux: BigInt(t.amount_lux),
          privateBuyer: t.buyer ? '0x' + sdk.hex(t.buyer) : null,
          expiresAtBlock: safeNumber(t.deadline),
          domainExpiresAtBlock: 0,
          returnPending: o.status === 'ReturnPending',
        }
      }),
    getAuction: (node, identity) =>
      wrapped(async () => {
        const { o, name } = await order(node, undefined, identity)
        if (!o || o.terms.kind !== 'Auction') return null
        const t = o.terms
        return {
          order: o,
          auctionId: safeNumber(t.id),
          durationBlocks: safeNumber(t.duration_blocks),
          startDeadlineBlockHeight: safeNumber(t.deadline),
          createdAtBlockHeight: 0,
          feeBps: t.fee_bps,
          node,
          name,
          sellerAuthority: '0x' + sdk.hex(t.seller),
          reservePriceLux: BigInt(t.amount_lux),
          startBlock: o.started_at === null ? null : safeNumber(o.started_at),
          endBlock: o.end === null ? null : safeNumber(o.end),
          highestBid: o.highest
            ? {
                bidderAuthority: '0x' + sdk.hex(sdk.authority(o.highest.payer)),
                amountLux: BigInt(o.highest.amount_lux),
                placedAtBlock: 0,
              }
            : null,
          bidCount: o.bid_count,
          returnPending: o.status === 'ReturnPending',
        }
      }),
    getOffer: (node, buyer, identity) =>
      wrapped(async () => {
        const { o } = await order(node, buyer, identity)
        if (!o || o.terms.kind !== 'Offer') return null
        return {
          order: o,
          offerId: safeNumber(o.terms.id),
          feeBps: o.terms.fee_bps,
          node,
          buyerAuthority: '0x' + sdk.hex(o.terms.buyer!),
          amountLux: BigInt(o.terms.amount_lux),
          expiresAtBlock: safeNumber(o.terms.deadline),
        }
      }),
    getRefund: (authority, marketplaceContractId) =>
      wrapped(async () => {
        const c = await client(),
          config = await c.directory.config()
        const target = marketplaceContractId ?? config.preferred_marketplace
        if (!target) throw new Error('Marketplace unavailable')
        const r = await c
          .marketplace(sdk.contractId(target))
          .read_refund({ authority: sdk.fromHex(authority, 32) })
        return r ? { authority, amountLux: BigInt(r.amount_lux) } : null
      }),
  }
}
