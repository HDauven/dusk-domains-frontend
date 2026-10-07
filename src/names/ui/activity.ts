// App presentation / HTTP view model, ported from SDK 0.2.0 (MIT).
export const ACTIVITY_EVENT_TYPES = [
  'directory_initialized',
  'store_initialized',
  'resolver_initialized',
  'vault_initialized',
  'policy_initialized',
  'proposal_created',
  'proposal_cancelled',
  'proposal_executed',
  'proposal_pruned',
  'action_applied',
  'operator_changed',
  'guardian_changed',
  'proposals_invalidated',
  'registration_pause_changed',
  'policy_suspension_changed',
  'delays_changed',
  'commitment_created',
  'commitment_removed',
  'root_registered',
  'root_renewed',
  'subtree_removed',
  'authorities_changed',
  'identity_cleared',
  'slot_changed',
  'primary_changed',
  'custody_started',
  'custody_ended',
  'root_counters_changed',
  'store_watermarks_changed',
  'resolver_slot_written',
  'resolver_slot_pruned',
  'fee_source_changed',
  'beneficiary_reserved',
  'fee_received',
  'referral_claimed',
  'protocol_claimed',
  'move_started',
  'move_progressed',
  'import_prepared',
  'import_row_staged',
  'import_ready',
  'root_imported',
  'root_forwarded',
  'move_cancelled',
  'import_rows_pruned',
  'forwarded_rows_pruned',
  'market_configured',
  'order_changed',
  'order_closed',
  'trade_settled',
  'refund_changed',
  'refund_claimed',
  'escrow_renewed',
  'registration',
  'renewal',
  'expiry',
  'release',
  'transfer',
  'resolver_change',
  'record_update',
  'primary_name',
  'primary_name_set',
  'primary_name_cleared',
  'subname_created',
  'subname_pruned',
  'subname_removed',
  'domain_fixed_sale_opened',
  'domain_fixed_sale_closed',
  'domain_fixed_sale_filled',
  'domain_auction_created',
  'domain_bid_placed',
  'domain_auction_cancelled',
  'domain_auction_settled',
  'domain_offer_placed',
  'domain_offer_closed',
  'domain_offer_accepted',
] as const

export type ActivityEventType = (typeof ACTIVITY_EVENT_TYPES)[number]

export type ActivityEntry = {
  marketplaceOrderId?: string
  marketplaceAction?: 'bid'
  id: string
  eventType: ActivityEventType
  node: string
  name: string
  actor: string
  timestamp: string
  blockHeight: number | null
  txId?: string
  target?: string | null
}

export type CreateActivityEntryArgs = {
  eventType: ActivityEventType
  node: string
  name: string
  actor: string
  timestamp?: string
  blockHeight?: number | null
  txId?: string
  target?: string | null
}

export function createActivityEntry(args: CreateActivityEntryArgs): ActivityEntry {
  const timestamp = args.timestamp ?? new Date().toISOString()
  return {
    id: [args.eventType, args.node, args.actor, args.txId ?? timestamp].join(':'),
    eventType: args.eventType,
    node: args.node,
    name: args.name,
    actor: args.actor,
    timestamp,
    blockHeight: args.blockHeight ?? null,
    ...(args.txId ? { txId: args.txId } : {}),
    ...(args.target ? { target: args.target } : {}),
  }
}

export function activityLabel(eventType: ActivityEventType): string {
  if (eventType === 'registration') return 'Registered'
  if (eventType === 'renewal') return 'Renewed'
  if (eventType === 'expiry') return 'Expired'
  if (eventType === 'release') return 'Released'
  if (eventType === 'transfer') return 'Transferred'
  if (eventType === 'resolver_change') return 'Record source changed'
  if (eventType === 'record_update') return 'Record updated'
  if (eventType === 'primary_name') return 'Primary domain set'
  if (eventType === 'primary_name_set') return 'Primary name set'
  if (eventType === 'primary_name_cleared') return 'Primary name cleared'
  if (eventType === 'subname_created') return 'Subdomain created'
  if (eventType === 'subname_removed') return 'Subname removed'
  if (eventType === 'subname_pruned') return 'Expired subdomain pruned'
  if (eventType === 'domain_fixed_sale_opened') return 'Listed for sale'
  if (eventType === 'domain_fixed_sale_closed') return 'Sale closed'
  if (eventType === 'domain_fixed_sale_filled') return 'Domain sold'
  if (eventType === 'domain_auction_created') return 'Auction created'
  if (eventType === 'domain_bid_placed') return 'Bid placed'
  if (eventType === 'domain_auction_cancelled') return 'Auction canceled'
  if (eventType === 'domain_auction_settled') return 'Auction settled'
  if (eventType === 'domain_offer_placed') return 'Offer placed'
  if (eventType === 'domain_offer_closed') return 'Offer closed'
  if (eventType === 'domain_offer_accepted') return 'Offer accepted'
  const labels: Partial<Record<ActivityEventType, string>> = {
    root_registered: 'Registered',
    root_renewed: 'Renewed',
    authorities_changed: 'Authorities changed',
    custody_started: 'Listed in marketplace custody',
    custody_ended: 'Returned from marketplace',
    root_forwarded: 'Moved to a new shard',
    resolver_slot_written: 'Records updated',
  }
  return labels[eventType] ?? eventType.replaceAll('_', ' ')
}

export function activityDescription(entry: ActivityEntry): string {
  const target = entry.target ? ` -> ${entry.target}` : ''
  return `${entry.name}${target}`
}
