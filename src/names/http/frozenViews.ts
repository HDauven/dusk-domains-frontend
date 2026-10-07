import { authority, encodeBase58, hex, parseJson, wireValue } from '@duskdomains/sdk'
import { safeNumber } from '../numbers'

type Row = Record<string, unknown>
const row = (v: unknown): v is Row => Boolean(v && typeof v === 'object' && !Array.isArray(v))
const hexId = (v: number[]) => '0x' + hex(v)
const displayNumbers =
  /^(?:.*BlockHeight|ttlSeconds|saleId|auctionId|durationBlocks|priceLux|reservePriceLux|amountLux|premiumLux|registrationPremiumLux|threeCharYearLux|fourCharYearLux|fivePlusYearLux|premiumStartLux)$/

// The HTTP activity encoding uses decimal strings for u64 fields, unlike driver JSON.
const orderIntegers = new Set([
  'generation',
  'serial',
  'id',
  'nonce',
  'deadline',
  'duration_blocks',
  'started_at',
  'end',
  'maximum_end',
])
function orderWireInput(value: unknown, key = ''): unknown {
  if (typeof value === 'string' && orderIntegers.has(key) && /^\d+$/.test(value)) return BigInt(value)
  if (Array.isArray(value)) return value.map((v) => orderWireInput(v))
  if (row(value)) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, orderWireInput(v, k)]))
  return value
}

/** Adapt the indexer's frozen read model to the application's presentation model.
 * Canonical objects remain lossless. Display numbers reject values outside the exact range.
 * Unknown dates remain absent; no block-to-wall-clock inference is used for writes.
 */
export function frozenView(input: unknown, path: string): unknown {
  if (Array.isArray(input)) return input.map((v) => frozenView(v, path))
  if (!row(input)) return input
  const v: Row = { ...input }
  for (const [key, value] of Object.entries(v)) {
    if (
      ['order', 'data', 'nameRef', 'policy', 'renewalSchedule', 'config', 'beneficiary', 'operator'].includes(
        key,
      )
    )
      continue
    if (
      typeof value === 'string' &&
      /^\d+$/.test(value) &&
      displayNumbers.test(key) &&
      !/treasury|referrals/.test(path)
    )
      v[key] = safeNumber(value)
    else if (Array.isArray(value) || row(value)) v[key] = frozenView(value, path)
  }
  if ('createdAtBlockHeight' in v && 'commitmentStore' in v && 'commitment' in v)
    Object.assign(v, {
      status: 'committed',
      committedBlockHeight: v.createdAtBlockHeight,
      committedTxId: null,
      createdAt: null,
      node: null,
      revealedBlockHeight: null,
      revealedTxId: null,
      lastEventType: 'registration_committed',
    })
  if ('canonicalName' in v && 'status' in v) {
    if (v.status === 'grace') v.status = 'expired'
    v.lastEventType ??= ''
  }
  if ('key' in v && 'visibility' in v) v.updatedAt ??= ''
  if ('parentNode' in v && 'expiryPolicy' in v) {
    for (const key of ['expiresAt', 'parentExpiresAt', 'createdAt', 'resolver']) v[key] ??= ''
    v.lastEventType ??= ''
    v.txId ??= null
    v.blockHeight ??= null
  }
  if ('eventType' in v && 'id' in v && 'node' in v) {
    v.name ??= ''
    v.actor ??= ''
    v.timestamp ??= ''
    if (v.txId === null) delete v.txId
  }
  if (path.endsWith('/record-history') && 'action' in v && 'eventType' in v) {
    v.record =
      v.action === 'set'
        ? {
            key: v.key,
            value: v.value,
            visibility: v.visibility ?? 'public',
            ttlSeconds: v.ttlSeconds ?? 0,
            updatedAt: v.updatedAt ?? '',
          }
        : null
    v.previousRecord = null
    v.controller = v.actor ?? ''
    v.updatedAt = v.timestamp ?? ''
    v.txId ??= null
    v.eventIndex ??= null
    v.action = v.action === 'set' ? 'set' : 'clear'
  }
  if (v.eventType === 'order_changed' && row(v.data) && row(v.data.order)) {
    const order = wireValue('Order', orderWireInput(v.data.order))
    v.marketplaceOrderId = String(order.terms.id)
    if (order.terms.kind === 'Auction' && order.highest && order.bid_count > 0) {
      v.marketplaceAction = 'bid'
      v.actor = hexId(authority(order.highest.payer))
      v.target = order.highest.amount_lux
    }
  }
  if ('orderJson' in v) {
    if (typeof v.orderJson !== 'string') throw new Error('Missing canonical marketplace order')
    const order = wireValue('Order', parseJson(v.orderJson)),
      t = order.terms
    v.order = order
    v.returnPending = order.status === 'ReturnPending'
    v.privateBuyer = t.buyer ? hexId(t.buyer) : null
    v.openedAtBlockHeight = 0
    v.createdAtBlockHeight = 0
    v.placedAtBlockHeight = 0
    v.highestBid = order.highest
      ? {
          bidderAuthority: hexId(authority(order.highest.payer)),
          amountLux: safeNumber(order.highest.amount_lux),
          placedAtBlockHeight: 0,
        }
      : null
    v.txId = null
    v.blockHeight = null
    v.lastEventType =
      t.kind === 'Fixed'
        ? 'domain_fixed_sale_opened'
        : t.kind === 'Auction'
          ? 'domain_auction_created'
          : 'domain_offer_placed'
  }
  if (path.endsWith('/marketplace/config') && 'orderApiVersion' in v)
    Object.assign(v, {
      router: null,
      treasuryContract: null,
      marketplaceAuthority: null,
      operator: null,
      pendingOperator: null,
      updatedAtBlockHeight: null,
      txId: null,
      blockHeight: null,
    })
  if (path.endsWith('/marketplace/refund') && 'authority' in v)
    Object.assign(v, {
      recipient: null,
      lastEventType: 'marketplace_refund_claimed',
      txId: null,
      blockHeight: null,
    })
  if (path.endsWith('/fee-config') && 'policy' in v) {
    const policy = row(v.policy) ? v.policy : {},
      p = row(policy.config) ? policy.config : {},
      renewal = row(v.renewalSchedule) ? v.renewalSchedule : {}
    Object.assign(v, {
      referralRewardBps: p.base_referral_bps,
      premiumReferralRewardBps: p.premium_referral_bps,
      renewalReferralRewardBps: renewal.referral_bps,
      version: policy.version == null ? null : safeNumber(String(policy.version)),
      updatedAt: 0,
      operator: null,
      txId: null,
      blockHeight: null,
    })
  }
  if (path.endsWith('/treasury') && v.source === 'vault') {
    const operator = row(v.operator) ? v.operator : {}
    Object.assign(v, {
      operator: operator.principal ?? (operator.kind ? operator : null),
      operatorRecipient:
        v.operatorRecipient ?? (Array.isArray(operator.recipient) ? encodeBase58(operator.recipient) : null),
      operatorAuthority: v.operatorAuthority ?? null,
      pendingOperator: null,
      pendingOperatorRecipient: null,
      allowedFeeSources: v.allowedFeeSources ?? [],
      availableLux: v.protocolAccruedLux,
      totalReceivedLux: v.totalReceivedLux ?? '0',
      registrationReceivedLux: v.registrationReceivedLux ?? '0',
      renewalReceivedLux: v.renewalReceivedLux ?? '0',
      otherReceivedLux: v.otherReceivedLux ?? '0',
      referralClaimableLux: v.referralLiabilityLux,
      referralClaimedLux: v.referralClaimedLux ?? '0',
      referralCount: v.referralCount ?? 0,
      lastFeeSourceContract: v.lastFeeSourceContract ?? null,
      lastFeeReason: v.lastFeeReason ?? null,
      lastFeeNode: v.lastFeeNode ?? null,
      lastEventType: v.lastEventType ?? null,
      txId: null,
      blockHeight: null,
      claims: (Array.isArray(v.claims) ? v.claims : Array.isArray(v.events) ? v.events : []).flatMap((e) => {
        if (!row(e) || !row(e.data) || e.eventType !== 'protocol_claimed') return []
        return [
          {
            operator: e.data.operator,
            operatorRecipient: Array.isArray(e.data.recipient) ? encodeBase58(e.data.recipient) : '',
            amountLux: e.data.amount_lux,
            remainingLux: e.data.remaining_lux,
            txId: e.txId ?? null,
            blockHeight: e.blockHeight ?? null,
          },
        ]
      }),
    })
  }
  if (path.endsWith('/referrals') && 'events' in v)
    Object.assign(v, {
      referralCount: v.referralCount ?? 0,
      recentActivity: (Array.isArray(v.events) ? v.events : []).flatMap((e) => {
        if (!row(e) || !row(e.data) || !['referral_claimed', 'fee_received'].includes(String(e.eventType)))
          return []
        return [
          {
            txId: e.txId ?? null,
            blockHeight: e.blockHeight ?? null,
            amountLux:
              e.eventType === 'fee_received' && row(e.data.metadata)
                ? e.data.metadata.referral_lux
                : e.data.amount_lux,
            kind: e.eventType === 'referral_claimed' ? 'claim' : 'accrual',
            counterparty: null,
          },
        ]
      }),
    })
  return v
}
