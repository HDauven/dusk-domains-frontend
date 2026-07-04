import type { DuskConnectOptions, ResolverRecord, ResolverRecordKey } from '../names/internal'

export const duskWalletInstallUrl = 'https://chromewebstore.google.com/detail/dusk-wallet/gcbboponngpmioapekmkajmffefaacld'
export const duskDomainsConnectOptions = {
  shieldedReceiveAddress: false,
  reason: 'Manage public .dusk domains and public domain records.',
  label: 'Dusk Domains',
} as const satisfies DuskConnectOptions
export const minDurationYears = 1
export const maxDurationYears = 10

export const editableRecordKeys = [
  'moonlight_address',
  'phoenix_payment_endpoint',
  'evm_address',
  'dusk_contract',
  'website',
  'avatar',
  'content_pointer',
  'text.description',
] as const satisfies readonly ResolverRecordKey[]

export const emptyResolverRecords: ResolverRecord[] = []

export function clampDurationYears(value: number) {
  if (!Number.isFinite(value)) return minDurationYears
  return Math.min(maxDurationYears, Math.max(minDurationYears, Math.round(value)))
}
