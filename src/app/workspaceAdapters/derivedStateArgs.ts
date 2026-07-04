import type { UseAppDerivedStateArgs } from '../appDerivedStateHelpers'
import type { AppCoreRuntimes } from '../useAppCoreRuntimes'
import type { DomainRecordState, NamePreview, RegistrationRuntime } from './types'

export function buildDerivedStateArgs({
  core,
  domainRecordState,
  namePreview,
  registrationRuntime,
}: {
  core: AppCoreRuntimes
  domainRecordState: DomainRecordState
  namePreview: NamePreview
  registrationRuntime: RegistrationRuntime
}): UseAppDerivedStateArgs {
  const { domainState, registrationState, searchState, walletRuntime } = core

  return {
    activeRecordTarget: domainRecordState.activeRecordTarget,
    canRegister: namePreview.canRegister,
    commitTxState: registrationState.commitTxState,
    committed: registrationState.committed,
    confirmationInput: domainState.confirmationInput,
    criticalRecordChange: domainRecordState.criticalRecordChange,
    criticalRecordConfirmationMatches: domainRecordState.criticalRecordConfirmationMatches,
    currentBlockHeight: searchState.currentBlockHeight,
    delegateSubnameNode: domainState.delegateSubnameNode,
    displayName: namePreview.displayName,
    managedName: domainState.managedName,
    managementTxState: domainState.managementTxState,
    moonlightRecord: domainRecordState.moonlightRecord,
    nodeHex: namePreview.nodeHex,
    pendingReservations: registrationRuntime.pendingReservations,
    preparedCommit: registrationState.preparedCommit,
    primaryEndpointValue: domainState.primaryEndpointValue,
    primaryName: domainState.primaryName,
    primaryTxState: domainState.primaryTxState,
    publicRecordAcknowledged: domainRecordState.publicRecordAcknowledged,
    recordDraftErrors: domainRecordState.recordDraftErrors,
    recordDraftMutations: domainRecordState.recordDraftMutations,
    recordTxState: domainState.recordTxState,
    registrationCompletion: registrationState.registrationCompletion,
    registrationTargetReady: registrationRuntime.registrationTargetReady,
    renewalTxState: domainState.renewalTxState,
    selectedAddress: walletRuntime.selectedAddress,
    selectedAuthority: walletRuntime.selectedAuthority,
    subnameLabel: domainState.subnameLabel,
    subnameManager: domainState.subnameManager,
    subnames: domainState.subnames,
    subnameTxState: domainState.subnameTxState,
    txState: registrationState.txState,
    walletSigningReady: walletRuntime.walletSession.canSign,
  }
}
