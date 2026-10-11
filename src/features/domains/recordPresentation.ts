import { getRecordDefinition, type ResolverRecordKey } from '../../names/internal'

function humanizeKey(key: string) {
  const words = key.replace(/[._:-]+/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function recordLabel(key: ResolverRecordKey) {
  if (key === 'moonlight_address') return 'Dusk address'
  if (key.startsWith('text.')) return getRecordDefinition(key)?.label ?? humanizeKey(key.slice('text.'.length))
  if (key.startsWith('service_endpoint.')) return `${humanizeKey(key.slice('service_endpoint.'.length))} endpoint`
  return getRecordDefinition(key)?.label ?? humanizeKey(key)
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
