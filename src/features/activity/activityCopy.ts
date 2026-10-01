import { ownerLabel, sameAuthority } from '../identity/ownerLabel'
import { recordLabel as readableRecordLabel } from '../domains/recordPresentation'
import {
  activityDescription,
  activityLabel,
  type ActivityEntry,
  type ResolverRecordKey,
} from '../../names/internal'
import { abbreviate } from '../../utils/format'
import { formatLuxNumberAsDusk } from '../treasury/feeConfig'

// Activity rows carry raw values: owner authorities, record keys, "moonlight_address:<address>",
// ISO dates and amounts in lux. These helpers read them the way a person would.

export const isViewer = sameAuthority

function who(authority: string, viewerAuthority?: string | null, addresses?: readonly string[]) {
  const identity = ownerLabel(authority, { viewerAuthority, addresses })
  return identity.kind === 'you' ? 'you' : identity.label
}

export function recordLabel(key: string) {
  return readableRecordLabel(key as ResolverRecordKey)
}

// "moonlight_address:<address>" names the address a primary name is shown for.
function primaryTarget(target: string) {
  const [, address] = target.split(':')
  return address ? `Shown for ${abbreviate(address)}` : 'Cleared'
}

export function activityTitle(entry: ActivityEntry) {
  if (entry.eventType === 'primary_name') return 'Primary name changed'
  if (entry.eventType === 'subname_created') return 'Subname created'
  if (entry.eventType === 'subname_pruned') return 'Expired subname removed'
  if (entry.eventType === 'domain_fixed_sale_filled') return 'Sold'
  return activityLabel(entry.eventType)
}

export function activityDetail(entry: ActivityEntry, viewerAuthority?: string | null, addresses?: readonly string[]) {
  const target = entry.target ?? ''
  if (entry.eventType === 'registration' || entry.eventType === 'transfer') return target ? `Owner: ${who(target, viewerAuthority, addresses)}` : ''
  if (entry.eventType === 'renewal') return /^\d{4}-\d{2}-\d{2}/u.test(target) ? `Now runs until ${target.slice(0, 10)}` : ''
  if (entry.eventType === 'record_update') return target ? recordLabel(target) : ''
  if (entry.eventType === 'primary_name') return ''
  if (entry.eventType === 'subname_created') return entry.name
  if (/^\d+$/u.test(target) && Number.isSafeInteger(Number(target))) return formatLuxNumberAsDusk(Number(target))
  return activityDescription(entry)
}

export function activityEventDetail(entry: ActivityEntry, viewerAuthority?: string | null, addresses?: readonly string[]) {
  if (entry.eventType !== 'primary_name') return activityDetail(entry, viewerAuthority, addresses)
  const address = entry.target?.replace(/^moonlight_address:/, '')
  return address && address !== 'cleared' ? `Dusk address: ${address}` : ''
}

export function activityActor(actor: string | null | undefined, viewerAuthority?: string | null, addresses?: readonly string[]) {
  if (!actor) return ''
  if (actor === 'marketplace') return 'Marketplace'
  return ownerLabel(actor, { viewerAuthority, addresses }).label
}

// Recent-change warnings name a record key or "moonlight_address:<address>".
export function recentTargetLabel(target: string | null | undefined, eventType: string) {
  if (!target) return eventType
  if (target.includes(':')) return primaryTarget(target)
  return recordLabel(target)
}
