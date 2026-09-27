import {
  activityDescription,
  activityLabel,
  getRecordDefinition,
  type ActivityEntry,
  type ResolverRecordKey,
} from '../../names/internal'
import { abbreviate } from '../../utils/format'
import { formatLuxNumberAsDusk } from '../treasury/feeConfig'

// Activity rows carry raw values: owner authorities, record keys, "moonlight_address:<address>",
// ISO dates and amounts in lux. These helpers read them the way a person would.

function authorityKey(value: string | null | undefined) {
  return String(value ?? '').trim().toLowerCase().replace(/^0x/u, '')
}

export function isViewer(authority: string | null | undefined, viewerAuthority: string | null | undefined) {
  return Boolean(authorityKey(authority)) && authorityKey(authority) === authorityKey(viewerAuthority)
}

function who(authority: string, viewerAuthority?: string | null) {
  return isViewer(authority, viewerAuthority) ? 'you' : abbreviate(authority)
}

export function recordLabel(key: string) {
  return getRecordDefinition(key as ResolverRecordKey)?.label ?? key
}

// "moonlight_address:<address>" names the address a primary name is shown for.
function primaryTarget(target: string) {
  const [, address] = target.split(':')
  return address ? `Shown for ${abbreviate(address)}` : 'Cleared'
}

export function activityTitle(entry: ActivityEntry) {
  if (entry.eventType === 'primary_name') return 'Primary name set'
  if (entry.eventType === 'subname_created') return 'Subname created'
  if (entry.eventType === 'domain_fixed_sale_filled') return 'Sold'
  return activityLabel(entry.eventType)
}

export function activityDetail(entry: ActivityEntry, viewerAuthority?: string | null) {
  const target = entry.target ?? ''
  if (entry.eventType === 'registration' || entry.eventType === 'transfer') return target ? `Owner: ${who(target, viewerAuthority)}` : ''
  if (entry.eventType === 'renewal') return /^\d{4}-\d{2}-\d{2}/u.test(target) ? `Now runs until ${target.slice(0, 10)}` : ''
  if (entry.eventType === 'record_update') return target ? recordLabel(target) : ''
  if (entry.eventType === 'primary_name') return primaryTarget(target)
  if (entry.eventType === 'subname_created') return entry.name
  if (/^\d+$/u.test(target) && Number.isSafeInteger(Number(target))) return formatLuxNumberAsDusk(Number(target))
  return activityDescription(entry)
}

export function activityActor(actor: string | null | undefined, viewerAuthority?: string | null) {
  if (!actor) return ''
  if (actor === 'marketplace') return 'Marketplace'
  return isViewer(actor, viewerAuthority) ? 'You' : abbreviate(actor)
}

// Recent-change warnings name a record key or "moonlight_address:<address>".
export function recentTargetLabel(target: string | null | undefined, eventType: string) {
  if (!target) return eventType
  if (target.includes(':')) return primaryTarget(target)
  return recordLabel(target)
}
