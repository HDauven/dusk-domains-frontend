import type { ActivityEntry, RecentChangeWarning } from '../../names/internal'
import { ownerLabel, sameAuthority } from '../identity/ownerLabel'
import { activityDetail, activityTitle } from './activityCopy'
import { actionKey, defaultPartyLabel, describeFrozenAction, isFrozenEntry, isSubnameTrace, priorState, type ActivityContext, type ActivityParty,
  type RelatedAction, type SubnameActivityFeed, type SubnameRemoval } from './activityEvents'

export type { ActivityContext, ActivityParty } from './activityEvents'

export type ActivityAction = {
  key: string
  /** The event that names the action; the others are folded into it. */
  entry: ActivityEntry
  events: ActivityEntry[]
  title: string
  details: string[]
  actor: ActivityParty | null
  txId?: string
  blockHeight: number | null
  timestamp: string
}

const priority: Partial<Record<ActivityEntry['eventType'], number>> = {
  registration: 100, subname_created: 90, domain_fixed_sale_filled: 85, domain_offer_accepted: 85,
  domain_auction_settled: 85, transfer: 80, renewal: 70, primary_name: 60, primary_name_set: 60, primary_name_cleared: 60, record_update: 50,
}

/** "you" for the connected account, a short Dusk address where one is known, else an owner ID. */
export function activityPartyLabel(viewerAuthority?: string | null, addresses: readonly string[] = []) {
  return (party: ActivityParty) => {
    if (party.kind === 'address') return sameAuthority(party.address, viewerAuthority) ? 'you' : defaultPartyLabel(party)
    if (party.kind === 'authority') {
      const identity = ownerLabel(party.authority, { viewerAuthority, addresses })
      return identity.kind === 'you' ? 'you' : identity.label
    }
    return defaultPartyLabel(party)
  }
}

// A transaction can emit registration, record, primary, counter and market events together.
// Present one action per transaction and name, keeping every event for the audit view.
export function activityActions(entries: readonly ActivityEntry[], context: ActivityContext = {}): ActivityAction[] {
  const groups = new Map<string, ActivityEntry[]>()
  for (const entry of entries) {
    const key = actionKey(entry)
    const group = groups.get(key) ?? []
    if (!group.some(item => item.id === entry.id)) group.push(entry)
    groups.set(key, group)
  }
  const prior = priorState(entries, context.holders)
  const label = context.label ?? activityPartyLabel(context.viewerAuthority, context.addresses)
  const activity = context.subnameActivity
  const related = activity?.feeds.length ? relatedActions(activity.feeds, { ...context, label }) : undefined
  const removals = activity && related ? subnameRemovals(groups, activity.feeds, related) : undefined
  // Pages can end inside a transaction, or between two in one block, which rows don't order. Until the
  // rest loads, leave out the oldest block (or at least the oldest transaction) rather than misread it.
  let complete = [...groups.entries()]
  if (context.partial && complete.length > 1) {
    const oldest = complete[complete.length - 1][1][0].blockHeight
    const newer = complete.filter(([, events]) => events[0].blockHeight !== oldest)
    complete = newer.length ? newer : complete.slice(0, -1)
  }
  return complete.flatMap(([key, events]) => {
    const head = events[0]
    const common = { key, events, txId: head.txId, blockHeight: head.blockHeight, timestamp: head.timestamp }
    if (events.some(isFrozenEntry)) {
      const described = describeFrozenAction(events.filter(isFrozenEntry), { ...context, label, related, removals }, prior)
      if (!described) return []
      const entry = events.find(event => !['root_counters_changed', 'store_watermarks_changed'].includes(event.eventType)) ?? head
      return [{ ...common, ...described, entry }]
    }
    const entry = events.reduce((best, event) => (priority[event.eventType] ?? 0) > (priority[best.eventType] ?? 0) ? event : best)
    const detail = activityDetail(entry, context.viewerAuthority, context.addresses)
    const actor: ActivityParty | null = entry.actor === 'marketplace' ? { kind: 'market' }
      : /^0x[0-9a-f]{64}$/i.test(entry.actor) ? { kind: 'authority', authority: entry.actor } : null
    return [{ ...common, entry, title: activityTitle(entry), details: detail ? [detail] : [], actor }]
  })
}

// Each subname's transactions as its own page reads them, credited from its own holders, by transaction.
function relatedActions(feeds: readonly SubnameActivityFeed[], context: ActivityContext) {
  const related = new Map<string, RelatedAction[]>()
  for (const feed of feeds) {
    const actions = activityActions(feed.entries, { ...context, holders: feed.holders, partial: feed.partial, subnames: [], subnameActivity: undefined, subject: feed.name })
    for (const action of actions) {
      if (!action.txId) continue
      related.set(action.txId, [...(related.get(action.txId) ?? []), { name: feed.name, title: action.title, details: action.details, actor: action.actor }])
    }
  }
  return related
}

// Root events that clear its subnames or move them away: registering it again, or moving it.
const clearsSubnames = new Set(['subtree_removed', 'root_forwarded', 'root_ceded'])

// Where a subname may have left the namespace: a subname transaction no subname read explains (a
// removal leaves only that on the root), the root clearing or moving its subnames, or a subname read
// that was created again over its old subtree. Today's subnames can't show all an earlier transaction touched.
function subnameRemovals(groups: ReadonlyMap<string, ActivityEntry[]>, feeds: readonly SubnameActivityFeed[],
  related: ReadonlyMap<string, readonly RelatedAction[]>): SubnameRemoval[] {
  const onRoot = [...groups.values()].map(events => events.filter(isFrozenEntry)).filter(events => events.length > 0
    && ((isSubnameTrace(events) && !related.has(events[0].txId ?? '')) || events.some(event => clearsSubnames.has(event.eventType))))
    .map(events => ({ txId: events[0].txId ?? null, blockHeight: events[0].blockHeight ?? null }))
  const recreated = feeds.flatMap(feed => feed.entries.filter(entry => entry.eventType === 'subtree_removed'))
    .map(entry => ({ txId: entry.txId ?? null, blockHeight: entry.blockHeight ?? null, removedOthers: removedOthers(entry) }))
  return [...onRoot, ...recreated]
}

// Its removed_count counts the target too when include_target is set. An unreadable count may be anything.
function removedOthers(entry: ActivityEntry) {
  const data = typeof entry.data === 'object' && entry.data !== null ? entry.data as Record<string, unknown> : {}
  const count = Number(data.removed_count)
  return !Number.isSafeInteger(count) || count > (data.include_target === false ? 0 : 1)
}

const paymentKeys = new Set(['moonlight_address', 'phoenix_payment_endpoint', 'evm_address',
  'address.btc', 'address.eth', 'address.sol', 'address.evm', 'dusk_contract', 'dusk_asset'])
// The records a name is registered with are where it starts, not a change to it.
const txKey = (entry: Pick<ActivityEntry, 'txId' | 'blockHeight' | 'actor'>) => entry.txId ?? `${entry.blockHeight}:${entry.actor}`

export function paymentWarnings(warnings: RecentChangeWarning[], viewerAuthority: string, activity: ActivityEntry[] = []) {
  const registrations = new Set(activity.filter(entry => entry.eventType === 'registration').map(txKey))
  return warnings.filter(warning => warning.eventType === 'record_update'
    && paymentKeys.has(warning.target ?? '') && !sameAuthority(warning.actor, viewerAuthority)
    && !registrations.has(txKey(warning)))
}
