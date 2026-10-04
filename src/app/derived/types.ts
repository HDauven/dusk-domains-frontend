import type { RecordTargetOption } from '../../features/domains/recordTypes'
import type { StrandedCommitment } from '../../features/registration/pendingReservationTypes'
import type { RegistrationCompletionState } from '../../features/registration/registrationCompletionState'
import type { PreparedRegistrationCommit } from '../../features/registration/usePendingReservations'
import type {
  DuskDomainTxState,
  PendingNameReservation,
  ResolverRecord,
  SubnameState,
} from '../../names/internal'
import type { ManagedNameState } from '../managedNameState'

export type UseAppDerivedStateArgs = {
  registrationsPaused?: boolean
  activeRecordTarget: RecordTargetOption | undefined
  canRegister: boolean
  chainId: string
  commitTxState: DuskDomainTxState | null
  committed: boolean
  confirmationInput: string
  currentBlockHeight: number | null
  displayName: string
  managedName: ManagedNameState
  managementTxState: DuskDomainTxState | null
  moonlightRecord: ResolverRecord | undefined
  nodeHex: string
  nowSeconds: number
  pendingReservations: PendingNameReservation[]
  preparedCommit: PreparedRegistrationCommit | null
  primaryEndpointValue: string
  primaryName: string | null
  connectedPrimaryName: string | null
  primaryTxState: DuskDomainTxState | null
  recordDraftErrors: readonly string[]
  recordDraftMutations: readonly unknown[]
  recordTxState: DuskDomainTxState | null
  registrationCompletion: RegistrationCompletionState | null
  registrationTargetReady: boolean
  renewalTxState: DuskDomainTxState | null
  selectedAddress: string
  selectedAuthority: string
  strandedCommitment: StrandedCommitment | null
  subnameLabel: string
  subnameManager: string
  subnames: SubnameState[]
  subnameTxState: DuskDomainTxState | null
  txState: DuskDomainTxState | null
  walletSigningReady: boolean
}
