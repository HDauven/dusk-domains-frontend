import type { RecordTargetOption } from '../../features/domains/recordTypes'
import type { RegistrationCompletionState } from '../../features/registration/registrationCompletionState'
import type { PreparedRegistrationCommit } from '../../features/registration/usePendingReservations'
import type {
  DuskDomainTxState,
  PendingNameReservation,
  ResolverRecord,
  SubnameState,
} from '../../names/internal'
import type { ManagedNameState } from '../appHelpers'

export type UseAppDerivedStateArgs = {
  activeRecordTarget: RecordTargetOption | undefined
  canRegister: boolean
  commitTxState: DuskDomainTxState | null
  committed: boolean
  confirmationInput: string
  criticalRecordChange: boolean
  criticalRecordConfirmationMatches: boolean
  currentBlockHeight: number | null
  delegateSubnameNode: string
  displayName: string
  managedName: ManagedNameState
  managementTxState: DuskDomainTxState | null
  moonlightRecord: ResolverRecord | undefined
  nodeHex: string
  pendingReservations: PendingNameReservation[]
  preparedCommit: PreparedRegistrationCommit | null
  primaryEndpointValue: string
  primaryName: string | null
  primaryTxState: DuskDomainTxState | null
  publicRecordAcknowledged: boolean
  recordDraftErrors: readonly string[]
  recordDraftMutations: readonly unknown[]
  recordTxState: DuskDomainTxState | null
  registrationCompletion: RegistrationCompletionState | null
  registrationTargetReady: boolean
  renewalTxState: DuskDomainTxState | null
  selectedAddress: string
  selectedAuthority: string
  subnameLabel: string
  subnameManager: string
  subnames: SubnameState[]
  subnameTxState: DuskDomainTxState | null
  txState: DuskDomainTxState | null
  walletSigningReady: boolean
}
