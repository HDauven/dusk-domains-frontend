import { contractPrincipalFromWalletAccount, encodeBase58 } from '../../names/internal'
import { abbreviate } from '../../utils/format'

function authorityKey(value: string) {
  const trimmed = value.trim()
  if (/^(?:0x)?[a-f0-9]{64}$/i.test(trimmed)) return trimmed.toLowerCase().replace(/^0x/, '')
  const parsed = contractPrincipalFromWalletAccount(trimmed)
  return parsed.ok && parsed.source === 'moonlight_account' ? parsed.principal.replace(/^0x/, '') : trimmed
}

export function sameAuthority(a: string | null | undefined, b: string | null | undefined) {
  return Boolean(a?.trim() && b?.trim()) && authorityKey(a!) === authorityKey(b!)
}

/** Shared by name pages, activity and market. Pass the chain authority and any known
 * Dusk addresses (record or primary endpoint). Candidates are verified against the
 * authority; a payment record alone is never evidence of ownership. No network reads.
 * `label` is compact text; `value` is the full copyable value. Explain `id` on demand. */
export function ownerLabel(authority: string, { viewerAuthority, addresses = [] }: {
  viewerAuthority?: string | null
  addresses?: readonly (string | null | undefined)[]
} = {}) {
  if (sameAuthority(authority, viewerAuthority)) return { kind: 'you' as const, label: 'You', value: authority }
  for (const address of [authority, ...addresses]) {
    if (!address) continue
    const parsed = contractPrincipalFromWalletAccount(address)
    if (parsed.ok && parsed.source === 'moonlight_account' && (address === authority || sameAuthority(parsed.principal, authority))) {
      return { kind: 'address' as const, label: abbreviate(address), value: address }
    }
  }
  // An authority can be any account's, a manager's or a bidder's as much as an owner's.
  return { kind: 'id' as const, label: `Account ID ${abbreviate(authority)}`, value: authority }
}

type ActivityAddressSource = { eventType: string; target?: string | null; data?: unknown }

const isEndpoint = (value: unknown): value is number[] => Array.isArray(value) && value.length === 96
  && value.every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 255)

// Public Dusk addresses an activity row names: who paid to register or renew, and a primary name's address.
function activityAddresses(entry: ActivityAddressSource) {
  const data = entry.data && typeof entry.data === 'object' ? entry.data as Record<string, unknown> : null
  if (!data) return []
  const payer = data.payer && typeof data.payer === 'object' ? data.payer as Record<string, unknown> : null
  const endpoints = [
    ...(['root_registered', 'root_renewed'].includes(entry.eventType) && payer?.kind === 'Moonlight' ? [payer.bytes] : []),
    ...(entry.eventType === 'primary_changed' ? [data.endpoint] : []),
  ]
  return endpoints.filter(isEndpoint).map(bytes => encodeBase58(Uint8Array.from(bytes)))
}

/** Address candidates already present in the loaded name records or activity. */
export function ownerAddressCandidates(records: readonly { key: string; value: string }[], activity: readonly ActivityAddressSource[] = []) {
  return [...new Set([
    ...records.filter(record => record.key === 'moonlight_address').map(record => record.value),
    ...activity.filter(entry => ['primary_name', 'primary_name_set', 'primary_name_cleared'].includes(entry.eventType) && entry.target?.startsWith('moonlight_address:')).map(entry => entry.target!.slice('moonlight_address:'.length)),
    ...activity.flatMap(activityAddresses),
  ])]
}
