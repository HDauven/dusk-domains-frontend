import type { Dispatch, SetStateAction } from 'react'
import type { ManagedNameState } from '../../app/appHelpers'
import type { SubmitNameWrite } from '../../app/useDuskDomainWriter'
import type { ConfirmedWriteFallback } from '../../app/useIndexerWriteFallback'
import type { LiveWritePreflight } from '../../app/useLiveWritePreflight'
import type {
  CoreFeeConfig,
  DuskDomainsRuntimeConfig,
  DuskDomainTxState,
} from '../../names/internal'
import type { WalletConnectionStatus } from '../wallet/walletStatus'

export type { SubmitNameWrite, ConfirmedWriteFallback }

export type AppendDomainSettingsActivity = (input: {
  eventType: 'transfer' | 'renewal'
  actor: string
  target?: string
  txId?: string
}) => void

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
  runtimeConfig: DuskDomainsRuntimeConfig
  selectedAuthority: string
  setDraftManager: Dispatch<SetStateAction<string>>
  setDraftOwner: Dispatch<SetStateAction<string>>
  setManagedName: Dispatch<SetStateAction<ManagedNameState>>
  setManagementError: Dispatch<SetStateAction<string>>
  setManagementTxState: Dispatch<SetStateAction<DuskDomainTxState | null>>
  setRenewalError: Dispatch<SetStateAction<string>>
  setRenewalTxState: Dispatch<SetStateAction<DuskDomainTxState | null>>
  shouldApplyPreviewWriteFallback: ConfirmedWriteFallback
  submitNameWrite: SubmitNameWrite
  walletSetupState: WalletConnectionStatus
} & LiveWritePreflight
