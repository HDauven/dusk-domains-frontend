import { contractPrincipalFromWalletAccount } from '../../names/internal'
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
  return { kind: 'id' as const, label: `Owner ID ${abbreviate(authority)}`, value: authority }
}

/** Address candidates already present in the loaded name records or primary-name activity. */
export function ownerAddressCandidates(records: readonly { key: string; value: string }[], activity: readonly { eventType: string; target?: string | null }[] = []) {
  return [...new Set([
    ...records.filter(record => record.key === 'moonlight_address').map(record => record.value),
    ...activity.filter(entry => ['primary_name', 'primary_name_set', 'primary_name_cleared'].includes(entry.eventType) && entry.target?.startsWith('moonlight_address:')).map(entry => entry.target!.slice('moonlight_address:'.length)),
  ])]
}
