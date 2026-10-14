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
import { admittedStores, rawRead } from './directoryMembers'
import { PrimaryTargetError, primaryLinks, primaryTarget, type PrimaryLink } from './primaryLinks'
import { retryReadRace } from './readRace'
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
  const located = await client.getName(spelling),
    view = local(located.value)
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
export async function registrationQuote(
  client: sdk.FrozenClient,
  spelling: string,
  years: number,
  actor: string,
) {
  const context = await openRegistrationContext(client),
    placement = await client.registrationPlacement(sdk.nameKey(spelling).root)
  const policy = await client.policy(sdk.contractId(context.policy)).config()
  const quote = await client.quoteRegistration(placement.store, {
    node: sdk.nameKey(spelling).node,
    label: spelling.split('.').at(-2)!,
    years,
    actor: sdk.fromHex(actor, 32),
    expected_policy_version: context.policy_version,
    expected_policy_config_version: policy.config_version,
  })
  return { store: placement.store, quote }
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
  const getName = async (spelling: string): Promise<DuskDomainsOnChainNameResponse> => {
    const c = await getClient(),
      name = sdk.normalizeNameInput(spelling),
      located = await c.getName(name),
      v = local(located.value)
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
  const records = async (spelling: string, keys?: string[]) => {
    const c = await getClient(),
      name = await requireName(c, sdk.normalizeNameInput(spelling))
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
  const primary = async (endpoint: import('./http/results').DuskEndpoint) => {
    if (endpoint.type !== 'moonlight_address')
      throw new Error('Only public Dusk addresses support primary names.')
    const c = await getClient()
    const bytes = endpointBytes(endpoint.value)
    // A store admitted since the last read is verified first. The snapshot then reads every store at
    // once, in a few round trips, so it finishes between blocks.
    await admittedStores(c)
    // SDK 0.3.2 verifyPrimary reads the raw mapping. The store's resolution
    // additionally requires the endpoint to be the current owner or manager.
    const v = await c.snapshot(async (height) => {
      const candidates = await Promise.all((await admittedStores(c)).map(async (admission) => {
        const store = sdk.contractId(admission.id)
        const primary = await rawRead(c, 'store', store, 'resolve_primary', { endpoint: bytes })
        if (!primary) return null
        const key = primary.primary.name.key
        const [home, name, resolved] = await Promise.all([
          rawRead(c, 'store', store, 'home', { root: key.root }),
          rawRead(c, 'store', store, 'get_name', key),
          rawRead(c, 'store', store, 'resolve_record', { key, record_key: 'moonlight_address' }),
        ])
        // The mapping counts only at the store its name lives in, not one it moved on from.
        if (typeof home === 'object' && 'Forwarded' in home) return null
        const view = local(name), record = local(resolved)
        if (!view || !record || !sdk.primaryNameStatus({ endpoint: bytes, primary, name: view, record, height }).verified) return null
        return { store, primary, record, height }
      }))
      const found = candidates.filter((candidate): candidate is sdk.VerifiedPrimary => candidate !== null)
      if (found.length > 1) throw new Error('Multiple resolved pool primaries')
      return found[0] ?? null
    })
    if (!v) return null
    return {
      endpoint,
      primaryName: v.primary.spelling,
      node: '0x' + sdk.hex(v.primary.primary.name.key.node),
      forwardRecord: recordView(v.record),
      verified: true as const,
    }
  }
  return {
    getCurrentBlockHeight: () =>
      wrapped(async () => safeNumber(await (await getClient()).transport.currentBlockHeight())),
    getName: (name) => wrapped(() => getName(name)),
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
        const c = await getClient(),
          n = await requireName(c, sdk.normalizeNameInput(name))
        const resolved = await c.locate<sdk.RecordValue | null>(
          n.store,
          n.ref.key.root,
          'resolve_record',
          {
            key: n.ref.key,
            record_key: key,
          },
        )
        const raw = local(resolved.value)
        if (!raw) throw new Error('Record is missing or the name is inactive')
        const r = recordView(raw)
        return {
          canonicalName: sdk.normalizeNameInput(name),
          node: namehashHex(sdk.normalizeNameInput(name)),
          endpoint: { type: r.key, value: r.value },
          record: r,
        }
      }),
    getPrimaryName: (endpoint) => wrapped(async () => (await primary(endpoint))?.primaryName ?? null),
    verifyPrimaryName: (endpoint, expectedName) =>
      wrapped(async () => {
        const p = await primary(endpoint)
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
    getRegistrationPremium: (name) =>
      wrapped(async () =>
        safeNumber(
          (await registrationQuote(await getClient(), name, 1, PREVIEW_QUOTE_ACTOR)).quote.quote
            .premium_lux,
        ),
      ),
    getRegistrationQuote: (name, years, actor) =>
      wrapped(async () => registrationQuote(await getClient(), name, years, actor)),
    getRenewalQuote: (name, years) =>
      wrapped(async () => {
        const c = await getClient(),
          n = await requireName(c, name),
          quote = await c.quoteRenewal(n.store, { name: n.ref, years })
        const v = local(quote.value)
        if (!v) throw new Error('Renewal unavailable')
        return { ...quote, quote: v, ref: n.ref }
      }),
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
    const n = await c.getName(indexed.canonicalName),
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
