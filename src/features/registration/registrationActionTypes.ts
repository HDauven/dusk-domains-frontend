import type { Dispatch, SetStateAction } from 'react'
import type { ManagedNameState } from '../../app/managedNameState'
import type { CurrentBlockHeightReader } from '../../app/duskNodeHeight'
import type { SubmitNameWrite } from '../../app/useDuskDomainWriter'
import type { ConfirmedWriteFallback } from '../../app/useIndexerWriteFallback'
import type { LiveWritePreflight } from '../../app/useLiveWritePreflight'
import type {
  CoreFeeConfig,
  DuskConnectAppLike,
  DuskDomainsIndexerClient,
  DuskDomainsOnChainClient,
  DuskDomainsRuntimeConfig,
  DuskDomainTxState,
  NameResult,
  RegistrationCommitWindow,
  ResolverRecord,
} from '../../names/internal'
import type { ReferralState } from '../referrals/referralState'
import type { StrandedCommitment } from './pendingReservationTypes'
import type { RegistrationCompletionState } from './registrationCompletionState'
import type { RegistrationStepId } from './registrationSteps'
import type { PreparedRegistrationCommit } from './usePendingReservations'

export type { SubmitNameWrite, ConfirmedWriteFallback }

export type AppendActivity = (input: {
  eventType: 'registration'
  actor: string
  target?: string
  txId?: string
}) => void

export type UseRegistrationActionsProps = {
  appliedReferral: ReferralState | null
  appendActivity: AppendActivity
  canPrepareCommit: boolean
  canRegister: boolean
  canRestartReservation: boolean
  committed: boolean
  commitWindow: RegistrationCommitWindow
  displayName: string
  duration: number
  duskDomainsOnChainClient: DuskDomainsOnChainClient | null
  feeConfig: CoreFeeConfig
  getCurrentBlockHeight: CurrentBlockHeightReader
  indexerClient: DuskDomainsIndexerClient | null
  lifecycleBaseBlockHeight: number
  liveDuskDomainsApp: DuskConnectAppLike | null
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
  runtimeConfig: DuskDomainsRuntimeConfig
  selectedAddress: string
  selectedAuthority: string
  setCommitTxState: Dispatch<SetStateAction<DuskDomainTxState | null>>
  setCommitted: Dispatch<SetStateAction<boolean>>
  setCurrentBlockHeight: Dispatch<SetStateAction<number | null>>
  setIndexerConfirmation: Dispatch<SetStateAction<string>>
  setIndexerError: Dispatch<SetStateAction<string>>
  setManagedName: Dispatch<SetStateAction<ManagedNameState>>
  setNowSeconds: Dispatch<SetStateAction<number>>
  setPreparedCommit: Dispatch<SetStateAction<PreparedRegistrationCommit | null>>
  setPrimaryEndpointValue: Dispatch<SetStateAction<string>>
  setConnectedPrimaryName: Dispatch<SetStateAction<string | null>>
  setPrimaryName: Dispatch<SetStateAction<string | null>>
  setRegistrationCompletion: Dispatch<SetStateAction<RegistrationCompletionState | null>>
  setRegistrationStep: Dispatch<SetStateAction<RegistrationStepId>>
  setResolverRecordSets: Dispatch<SetStateAction<Record<string, ResolverRecord[]>>>
  setStrandedCommitment: Dispatch<SetStateAction<StrandedCommitment | null>>
  setTxState: Dispatch<SetStateAction<DuskDomainTxState | null>>
  setWalletError: Dispatch<SetStateAction<string>>
  shouldApplyPreviewWriteFallback: ConfirmedWriteFallback
  submitNameWrite: SubmitNameWrite
} & LiveWritePreflight
