import type { Dispatch, SetStateAction } from 'react'
import type { SubmitNameWrite } from '../../app/useDuskDomainWriter'
import type { LiveWritePreflight } from '../../app/useLiveWritePreflight'
import type {
  CoreFeeConfig,
  DuskDomainsIndexerClient,
  DuskDomainsRuntimeConfig,
  DuskDomainTxState,
  IndexedTreasuryState,
} from '../../names/internal'
import type { FeeConfigFormState } from './feeConfig'

export type { SubmitNameWrite }

export type UseTreasuryActionsProps = {
  connectedAsTreasuryOperator: boolean
  feeConfig: CoreFeeConfig
  feeConfigBusy: boolean
  feeConfigForm: FeeConfigFormState
  indexerClient: DuskDomainsIndexerClient | null
  liveDuskDomainsApp: unknown
  loadFeeConfig: () => Promise<boolean>
  loadTreasury: () => Promise<boolean>
  resetTreasuryClaimAmount: () => void
  runtimeConfig: DuskDomainsRuntimeConfig
  selectedAddress: string
  setFeeConfigConfirmation: (message: string) => void
  setFeeConfigTxState: Dispatch<SetStateAction<DuskDomainTxState | null>>
  setFeeConfigUpdateError: (message: string) => void
  setTreasuryConfirmation: (message: string) => void
  setTreasuryError: (message: string) => void
  setTreasuryTxState: Dispatch<SetStateAction<DuskDomainTxState | null>>
  submitNameWrite: SubmitNameWrite
  treasuryAvailable: boolean
  treasuryBusy: boolean
  treasuryClaimAmountError: string
  treasuryClaimAmountLux: number | null
  treasuryState: IndexedTreasuryState
} & LiveWritePreflight
