import type { Dispatch, SetStateAction } from 'react'
import type {
  CoreFeeConfig,
  DuskNameCallMetadata,
  DuskNamesIndexerClient,
  DuskNamesRuntimeConfig,
  DuskNameTxState,
  IndexedTreasuryState,
  SubmitDuskNameWriteOptions,
} from '../../names/internal'
import type { FeeConfigFormState } from './feeConfig'

export type SubmitNameWrite = (
  name: string,
  call: DuskNameCallMetadata,
  options?: SubmitDuskNameWriteOptions,
) => Promise<DuskNameTxState>

export type UseTreasuryActionsProps = {
  connectedAsTreasuryOperator: boolean
  feeConfig: CoreFeeConfig
  feeConfigBusy: boolean
  feeConfigForm: FeeConfigFormState
  indexerClient: DuskNamesIndexerClient | null
  liveDuskNamesApp: unknown
  loadFeeConfig: () => Promise<boolean>
  loadTreasury: () => Promise<boolean>
  resetTreasuryClaimAmount: () => void
  runtimeConfig: DuskNamesRuntimeConfig
  selectedAddress: string
  setFeeConfigConfirmation: (message: string) => void
  setFeeConfigTxState: Dispatch<SetStateAction<DuskNameTxState | null>>
  setFeeConfigUpdateError: (message: string) => void
  setTreasuryConfirmation: (message: string) => void
  setTreasuryError: (message: string) => void
  setTreasuryTxState: Dispatch<SetStateAction<DuskNameTxState | null>>
  submitNameWrite: SubmitNameWrite
  treasuryAvailable: boolean
  treasuryBusy: boolean
  treasuryClaimAmountError: string
  treasuryClaimAmountLux: number | null
  treasuryState: IndexedTreasuryState
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
