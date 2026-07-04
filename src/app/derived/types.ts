import type { RecordTargetOption } from '../../features/domains/recordTypes'
import type { RegistrationCompletionState } from '../../features/registration/registrationCompletionState'
import type { PreparedRegistrationCommit } from '../../features/registration/usePendingReservations'
import type {
  DuskNameTxState,
  PendingNameReservation,
  ResolverRecord,
  SubnameState,
} from '../../names/internal'
import type { ManagedNameState } from '../appHelpers'

export type UseAppDerivedStateArgs = {
  activeRecordTarget: RecordTargetOption | undefined
  canRegister: boolean
  commitTxState: DuskNameTxState | null
  committed: boolean
  confirmationInput: string
  criticalRecordChange: boolean
  criticalRecordConfirmationMatches: boolean
  currentBlockHeight: number | null
  delegateSubnameNode: string
  displayName: string
  managedName: ManagedNameState
  managementTxState: DuskNameTxState | null
  moonlightRecord: ResolverRecord | undefined
  nodeHex: string
  pendingReservations: PendingNameReservation[]
  preparedCommit: PreparedRegistrationCommit | null
  primaryEndpointValue: string
  primaryName: string | null
  primaryTxState: DuskNameTxState | null
  publicRecordAcknowledged: boolean
  recordDraftErrors: readonly string[]
  recordDraftMutations: readonly unknown[]
  recordTxState: DuskNameTxState | null
  registrationCompletion: RegistrationCompletionState | null
  registrationTargetReady: boolean
  renewalTxState: DuskNameTxState | null
  selectedAddress: string
  selectedAuthority: string
  subnameLabel: string
  subnameManager: string
  subnames: SubnameState[]
  subnameTxState: DuskNameTxState | null
  txState: DuskNameTxState | null
  walletSigningReady: boolean
}
