import type {
  CoreFeeConfig,
  DuskNamesIndexerClient,
  DuskNamesRuntimeConfig,
} from '../../names/internal'
import type { WalletSessionModel } from '../wallet/walletStatus'
import type { SubmitNameWrite } from './treasuryActionTypes'

export type LiveWritePreflight = {
  ensureContractAuthorityForLiveWrite: (
    action: string,
    setError: (message: string) => void,
  ) => boolean
  ensurePublicBalanceForLiveWrite: (
    action: string,
    setError: (message: string) => void,
    minimumLux?: number,
    depositLux?: bigint,
  ) => Promise<boolean>
}

export type UseTreasuryFeatureArgs = {
  indexerClient: DuskNamesIndexerClient | null
  feeConfig: CoreFeeConfig
  feeConfigError: string
  feeConfigLoading: boolean
  liveDuskNamesApp: unknown
  loadFeeConfig: () => Promise<boolean>
  onOpenWalletConnection: () => void
  runtimeConfig: DuskNamesRuntimeConfig
  selectedTypedPrincipalKey: string
  submitNameWrite: SubmitNameWrite
  walletSession: WalletSessionModel
} & LiveWritePreflight
