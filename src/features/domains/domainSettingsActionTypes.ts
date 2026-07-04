import type { Dispatch, SetStateAction } from 'react'
import type { ManagedNameState } from '../../app/appHelpers'
import type {
  CoreFeeConfig,
  DuskNameCallMetadata,
  DuskNamesIndexerClient,
  DuskNamesRuntimeConfig,
  DuskNameTxState,
  SubmitDuskNameWriteOptions,
} from '../../names/internal'
import type { WalletConnectionStatus } from '../wallet/walletStatus'

export type SubmitNameWrite = (
  name: string,
  call: DuskNameCallMetadata,
  options?: SubmitDuskNameWriteOptions,
) => Promise<DuskNameTxState>

export type AppendDomainSettingsActivity = (input: {
  eventType: 'transfer' | 'renewal'
  actor: string
  target?: string
  txId?: string
}) => void

export type ConfirmedWriteFallback = (
  description: string,
  check?: (client: DuskNamesIndexerClient) => Promise<boolean>,
) => Promise<boolean>

export type UseDomainSettingsActionsProps = {
  appendActivity: AppendDomainSettingsActivity
  canManageName: boolean
  canRenewName: boolean
  currentBlockHeight: number | null
  displayName: string
  draftManager: string
  draftOwner: string
  feeConfig: CoreFeeConfig
  lifecycleBaseBlockHeight: number
  managedName: ManagedNameState
  nodeHex: string
  nowSeconds: number
  renewalYears: number
  resultLabel: string
  runtimeConfig: DuskNamesRuntimeConfig
  selectedAuthority: string
  setDraftManager: Dispatch<SetStateAction<string>>
  setDraftOwner: Dispatch<SetStateAction<string>>
  setManagedName: Dispatch<SetStateAction<ManagedNameState>>
  setManagementError: Dispatch<SetStateAction<string>>
  setManagementTxState: Dispatch<SetStateAction<DuskNameTxState | null>>
  setRenewalError: Dispatch<SetStateAction<string>>
  setRenewalTxState: Dispatch<SetStateAction<DuskNameTxState | null>>
  shouldApplyPreviewWriteFallback: ConfirmedWriteFallback
  submitNameWrite: SubmitNameWrite
  walletSetupState: WalletConnectionStatus
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
