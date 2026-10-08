import type {
  CoreFeeConfig,
  DuskDomainsIndexerClient,
  DuskDomainsRuntimeConfig,
} from '../../names/internal'
import type { WalletSessionModel } from '../wallet/walletStatus'
import type { SubmitNameWrite } from '../../app/useDuskDomainWriter'
import type { LiveWritePreflight } from '../../app/useLiveWritePreflight'

export type { LiveWritePreflight }

export type UseTreasuryFeatureArgs = {
  indexerClient: DuskDomainsIndexerClient | null
  feeConfig: CoreFeeConfig
  feeConfigError: string
  feeConfigLoaded: boolean
  feeConfigLoading: boolean
  liveDuskDomainsApp: unknown
  loadFeeConfig: (options?: { fresh?: boolean }) => Promise<boolean>
  onOpenWalletConnection: () => void
  runtimeConfig: DuskDomainsRuntimeConfig
  selectedTypedPrincipalKey: string
  submitNameWrite: SubmitNameWrite
  walletSession: WalletSessionModel
} & LiveWritePreflight
