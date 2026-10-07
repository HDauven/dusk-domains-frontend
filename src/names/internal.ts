// The frontend owns presentation and its deployed indexer's HTTP views.
// Frozen wire APIs are imported directly by the canonical adapters.
export * from './ui/errors'
export * from './ui/records'
export * from './ui/drafts'
export * from './ui/names'
export * from './ui/lifecycle'
export * from './ui/primary'
export * from './ui/subnames'
export * from './ui/activity'
export * from './ui/warnings'
export * from './ui/referrals'
export * from './ui/confirmation'
export * from './http/types'
export * from './http/client'
export * from './hash'
export * from './commands'
export * from './config'
export * from './readTypes'
export * from './marketTypes'
export * from './reads'
export * from './transactions'
export * from './reservations'
export {
  contractPrincipalFromWalletAccount,
  typedPrincipalFromWalletAccount,
  contractPrincipal,
  isClaimableReferrer,
  principalKey,
  principalLabel,
  principalShortValue,
  createRegistrationSecret,
  registrationCommitmentHex,
  PREMIUM_WINDOW_DAYS,
} from '@duskdomains/sdk'
export type { DuskPrincipal } from '@duskdomains/sdk'
export {
  createDuskWallet,
  DUSK_ANNOUNCE_PROVIDER_EVENT,
  DUSK_REQUEST_PROVIDER_EVENT,
  DUSK_SELECTED_PROVIDER_STORAGE_KEY,
} from '@dusk/connect'
export type {
  ConnectOptions as DuskConnectOptions,
  DuskProfile,
  DuskProvider,
  DuskProviderInfo,
  DuskWallet,
  DuskWalletState,
  SwitchChainParams,
} from '@dusk/connect'

export { encodeBase58, formatLuxAsDusk } from '@duskdomains/sdk'
export type { ContractPrincipalResult, DuskPrincipalResult } from '@duskdomains/sdk'
