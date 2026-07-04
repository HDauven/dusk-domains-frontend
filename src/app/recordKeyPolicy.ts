import type { ResolverRecordKey } from '../names/internal'

export function isCriticalRecordKey(key: ResolverRecordKey) {
  return key === 'moonlight_address'
    || key === 'phoenix_payment_endpoint'
    || key === 'dusk_contract'
    || key.startsWith('service_endpoint.')
}
