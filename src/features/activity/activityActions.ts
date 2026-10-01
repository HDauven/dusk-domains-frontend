import type { ActivityEntry, RecentChangeWarning } from '../../names/internal'
import { sameAuthority } from '../identity/ownerLabel'

const priority: Partial<Record<ActivityEntry['eventType'], number>> = {
  registration: 100, subname_created: 90, domain_fixed_sale_filled: 85, domain_offer_accepted: 85,
  domain_auction_settled: 85, transfer: 80, renewal: 70, primary_name: 60, record_update: 50,
}

// A transaction can emit registration, transfer, record and primary events together.
// Keep every event for Details, but present one action per transaction and name.
export function activityActions(entries: ActivityEntry[]) {
  const groups = new Map<string, ActivityEntry[]>()
  for (const entry of entries) {
    const key = entry.txId ? `${entry.node}:${entry.txId}` : entry.id
    const group = groups.get(key) ?? []
    if (!group.some(item => item.id === entry.id)) group.push(entry)
    groups.set(key, group)
  }
  return [...groups.values()].map(events => ({
    entry: events.reduce((best, entry) => (priority[entry.eventType] ?? 0) > (priority[best.eventType] ?? 0) ? entry : best),
    events,
  }))
}

const paymentKeys = new Set(['moonlight_address', 'phoenix_payment_endpoint', 'evm_address', 'dusk_contract', 'dusk_asset'])
export function paymentWarnings(warnings: RecentChangeWarning[], viewerAuthority: string) {
  return warnings.filter(warning => warning.eventType === 'record_update'
    && paymentKeys.has(warning.target ?? '') && !sameAuthority(warning.actor, viewerAuthority))
}
