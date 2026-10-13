import { getRecordDefinition, STATIC_RECORD_DEFINITIONS, type ResolverRecordKey } from '../../names/internal'
export { addressRecordIssue } from '../identity/addressTrust'

// The resolver accepts any key of 1-64 bytes, so a key can look like a familiar one: "Website",
// "website" followed by a zero-width space, or "text.dusk_address". Only these exact keys get a
// label of their own or a link; any other key is shown as it is, marked as a custom record.
const knownKeys = new Set<string>([
  ...STATIC_RECORD_DEFINITIONS.map(definition => definition.key),
  'text.x', 'text.discord', 'text.github', 'text.link', 'text.description',
])

export function isKnownRecordKey(key: string): key is ResolverRecordKey {
  return knownKeys.has(key)
}

// Characters a reader can't see or tell apart in a key: controls, format characters such as
// zero-width spaces and joiners, separators, variation selectors and other ignorable code points.
const hidden = /[\p{Cc}\p{Cf}\p{Co}\p{Cn}\p{Cs}\p{Z}\p{White_Space}\p{Default_Ignorable_Code_Point}\p{Variation_Selector}]/gu

/** A key as it is, with each character a reader couldn't see spelled out, such as [U+200B]. */
export function visibleRecordKey(key: string) {
  return key.replace(hidden, character => `[U+${character.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}]`)
}

/** A known key's label; any other key quoted as it is, so it never reads as a known label. */
export function recordLabel(key: ResolverRecordKey) {
  if (!isKnownRecordKey(key)) return `“${visibleRecordKey(key)}”`
  if (key === 'moonlight_address') return 'Dusk address'
  return getRecordDefinition(key)?.label ?? key
}

export function isIdentifierRecord(key: ResolverRecordKey) {
  return ['moonlight_address', 'phoenix_payment_endpoint', 'evm_address', 'address.btc', 'address.eth', 'address.sol', 'address.evm', 'dusk_contract', 'dusk_asset',
    'content_pointer', 'attestation_ref', 'compliance_ref'].includes(key)
}

const recordHelpText: Partial<Record<ResolverRecordKey, string>> = {
  'text.x': 'Your X handle, like @nightowls.',
  'text.discord': 'A Discord invite link, like discord.gg/nightowls, or your Discord username.',
  'text.github': 'Your GitHub user or organization name.',
  'text.link': 'Any https:// link, like a Telegram group or a LinkedIn page.',
}

/** What to enter for a record, where a type has its own format. */
export function recordHelp(key: ResolverRecordKey) {
  return recordHelpText[key] ?? null
}
