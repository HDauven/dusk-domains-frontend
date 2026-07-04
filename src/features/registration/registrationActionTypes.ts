import type { Dispatch, SetStateAction } from 'react'
import type { ManagedNameState } from '../../app/appHelpers'
import type {
  CoreFeeConfig,
  DuskNameCallMetadata,
  DuskNamesIndexerClient,
  DuskNamesRuntimeConfig,
  DuskNameTxState,
  NameResult,
  RegistrationCommitWindow,
  ResolverRecord,
  SubmitDuskNameWriteOptions,
} from '../../names/internal'
import type { ReferralState } from '../referrals/referralState'
import type { RegistrationCompletionState } from './registrationCompletionState'
import type { RegistrationStepId } from './registrationSteps'
import type { PreparedRegistrationCommit } from './usePendingReservations'

export type SubmitNameWrite = (
  name: string,
  call: DuskNameCallMetadata,
  options?: SubmitDuskNameWriteOptions,
) => Promise<DuskNameTxState>

export type AppendActivity = (input: {
  eventType: 'registration'
  actor: string
  target?: string
  txId?: string
}) => void

export type ConfirmedWriteFallback = (
  description: string,
  check?: (client: DuskNamesIndexerClient) => Promise<boolean>,
) => Promise<boolean>

export type UseRegistrationActionsProps = {
  appliedReferral: ReferralState | null
  appendActivity: AppendActivity
  canPrepareCommit: boolean
  canRegister: boolean
  committed: boolean
  commitWindow: RegistrationCommitWindow
  displayName: string
  duration: number
  feeConfig: CoreFeeConfig
  indexerClient: DuskNamesIndexerClient | null
  lifecycleBaseBlockHeight: number
  liveDuskNamesApp: unknown
  loadPendingReservations: () => void
  nodeHex: string
  preparedCommit: PreparedRegistrationCommit | null
  recordSourceContractId: string
  refreshCommitBlockState: (commitment: string) => Promise<boolean>
  registerSetsPrimary: boolean
  registrationTargetAddress: string
  registrationTargetAddressErrors: string[]
  registrationTargetReady: boolean
  result: NameResult
  runtimeConfig: DuskNamesRuntimeConfig
  selectedAddress: string
  selectedAuthority: string
  setCommitTxState: Dispatch<SetStateAction<DuskNameTxState | null>>
  setCommitted: Dispatch<SetStateAction<boolean>>
  setCurrentBlockHeight: Dispatch<SetStateAction<number | null>>
  setDraftManager: Dispatch<SetStateAction<string>>
  setDraftOwner: Dispatch<SetStateAction<string>>
  setDraftResolver: Dispatch<SetStateAction<string>>
  setIndexerConfirmation: Dispatch<SetStateAction<string>>
  setIndexerError: Dispatch<SetStateAction<string>>
  setManagedName: Dispatch<SetStateAction<ManagedNameState>>
  setNowSeconds: Dispatch<SetStateAction<number>>
  setPreparedCommit: Dispatch<SetStateAction<PreparedRegistrationCommit | null>>
  setPrimaryEndpointValue: Dispatch<SetStateAction<string>>
  setPrimaryName: Dispatch<SetStateAction<string | null>>
  setRegistrationCompletion: Dispatch<SetStateAction<RegistrationCompletionState | null>>
  setRegistrationStep: Dispatch<SetStateAction<RegistrationStepId>>
  setResolverRecordSets: Dispatch<SetStateAction<Record<string, ResolverRecord[]>>>
  setTxState: Dispatch<SetStateAction<DuskNameTxState | null>>
  setWalletError: Dispatch<SetStateAction<string>>
  shouldApplyPreviewWriteFallback: ConfirmedWriteFallback
  submitNameWrite: SubmitNameWrite
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
