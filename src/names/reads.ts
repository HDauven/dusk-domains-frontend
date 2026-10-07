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
import { getRecordDefinition, type ResolverRecordKey } from './ui/records'
import { namehashHex } from './hash'
import { safeNumber } from './numbers'
import { success, failure } from './http/resultHelpers'
import { listPendingNameReservations } from './reservations'
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
export async function registrationQuote(
  client: sdk.FrozenClient,
  spelling: string,
  years: number,
  actor: string,
) {
  const located = await client.getName(spelling),
    context = await client.directory.registration_context()
  const policy = await client.policy(sdk.contractId(context.policy)).config()
  const quote = await client.quoteRegistration(located.store, {
    node: sdk.nameKey(spelling).node,
    label: spelling.split('.').at(-2)!,
    years,
    actor: sdk.fromHex(actor, 32),
    expected_policy_version: context.policy_version,
    expected_policy_config_version: policy.config_version,
  })
  return { store: located.store, quote }
}
export async function registrationRegistry(
  app: DuskConnectAppLike,
  _contracts: DuskDomainContractMap,
  name: string,
): Promise<string> {
  if (!app.client) throw new Error('Frozen client unavailable')
  return (await (await app.client).getName(name)).store
}
export function createDuskDomainsOnChainReadTransport(
  app: DuskConnectAppLike,
  _contracts: DuskDomainContractMap,
): DuskDomainsOnChainReadTransport {
  return {
    client: app.client,
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
    return success(await read())
  } catch (e) {
    return failure<T>('contract_read_failed', e instanceof Error ? e.message : String(e))
  }
}
export function createDuskDomainsOnChainClient(
  options: DuskDomainsOnChainClientOptions,
): DuskDomainsOnChainClient {
  const getClient = async () => {
    if (!options.read.client) throw new Error('Frozen client unavailable')
    return options.read.client
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
  const primary = async (endpoint: import('./http/results').DuskEndpoint) => {
    if (endpoint.type !== 'moonlight_address')
      throw new Error('Only public Dusk addresses support primary names.')
    const c = await getClient(),
      v = await c.verifyPrimary(endpointBytes(endpoint.value))
    if (!v) throw new Error('No verified primary name')
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
    getPrimaryName: (endpoint) => wrapped(async () => (await primary(endpoint)).primaryName),
    verifyPrimaryName: (endpoint, expectedName) =>
      wrapped(async () => {
        const p = await primary(endpoint)
        if (expectedName && expectedName !== p.primaryName) throw new Error('Primary name mismatch')
        return p
      }),
    readPrimaryName: (endpoint) =>
      wrapped(async () => {
        const c = await getClient(),
          { stores } = await c.discover()
        for (const store of stores) {
          const p = await c
            .store(sdk.contractId(store.id))
            .read_primary({ endpoint: endpointBytes(endpoint.value) })
          if (p)
            return {
              endpoint,
              node: '0x' + sdk.hex(p.primary.name.key.node),
              name: p.spelling,
              updatedAtBlock: safeNumber(p.primary.updated_at),
            }
        }
        return null
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
    if (!read.client) throw new Error('Frozen client unavailable')
    return read.client
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
