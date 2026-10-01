import { getRecordDefinition, type ResolverRecordKey } from '../../names/internal'

function humanizeKey(key: string) {
  const words = key.replace(/[._:-]+/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function recordLabel(key: ResolverRecordKey) {
  if (key === 'moonlight_address') return 'Dusk address'
  if (key.startsWith('text.')) return humanizeKey(key.slice('text.'.length))
  if (key.startsWith('service_endpoint.')) return `${humanizeKey(key.slice('service_endpoint.'.length))} endpoint`
  return getRecordDefinition(key)?.label ?? humanizeKey(key)
}

export function isIdentifierRecord(key: ResolverRecordKey) {
  return ['moonlight_address', 'phoenix_payment_endpoint', 'evm_address', 'dusk_contract', 'dusk_asset',
    'content_pointer', 'attestation_ref', 'compliance_ref'].includes(key)
}
