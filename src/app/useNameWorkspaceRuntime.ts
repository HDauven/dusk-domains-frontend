import type { AppCoreRuntimes } from './useAppCoreRuntimes'
import { editableRecordKeys } from './appConstants'
import { deriveAppDerivedState } from './derived/deriveAppDerivedState'
import { useAppWalletDefaults } from './useAppWalletDefaults'
import { useRegistrationRuntime } from './useRegistrationRuntime'
import { useActivityFeed } from '../features/activity/useActivityFeed'
import { useDomainRecordState } from '../features/domains/useDomainRecordState'
import { useNamePreview } from '../features/search/useNamePreview'

// Everything about the name being looked at: its preview, activity, registration and records,
// and the flags derived from them.
export function useNameWorkspaceRuntime(core: AppCoreRuntimes) {
  const { appRuntime, domainState, economicsRuntime, registrationState, searchState, walletRuntime } = core

  const namePreview = useNamePreview({
    apiSearchResult: searchState.apiSearchResult,
    currentBlockHeight: searchState.currentBlockHeight,
    duration: registrationState.duration,
    feeConfig: economicsRuntime.feeConfig,
    managedNameExpiresAt: domainState.managedName.expiresAt,
    nowSeconds: searchState.nowSeconds,
    query: searchState.query,
    renewalYears: domainState.renewalYears,
  })
  const activityFeed = useActivityFeed({
    indexerClient: appRuntime.indexerClient,
    setError: searchState.setIndexerError,
    defaultName: namePreview.displayName,
    defaultNode: namePreview.nodeHex,
  })
  const registrationRuntime = useRegistrationRuntime({
    canRegister: namePreview.canRegister,
    chainId: appRuntime.runtimeConfig.chainId,
    committed: registrationState.committed,
    getCurrentBlockHeight: appRuntime.getCurrentBlockHeight,
    indexerClient: appRuntime.indexerClient,
    mainView: searchState.mainView,
    preparedCommit: registrationState.preparedCommit,
    registerSetsPrimary: registrationState.registerSetsPrimary,
    registrationAddressInput: registrationState.registrationAddressInput,
    registrationStep: registrationState.registrationStep,
    selectedAddress: walletRuntime.selectedAddress,
    selectedAuthority: walletRuntime.selectedAuthority,
    setCurrentBlockHeight: searchState.setCurrentBlockHeight,
    setNowSeconds: searchState.setNowSeconds,
    setPreparedCommit: registrationState.setPreparedCommit,
    walletSetupState: walletRuntime.walletSetupState,
  })
  const domainRecordState = useDomainRecordState({
    displayName: namePreview.displayName,
    editableRecordKeys,
    nodeHex: namePreview.nodeHex,
  })
  const derivedState = deriveAppDerivedState({
    registrationsPaused: appRuntime.pause.registrationsPaused,
    activeRecordTarget: domainRecordState.activeRecordTarget,
    canRegister: namePreview.canRegister,
    commitTxState: registrationState.commitTxState,
    committed: registrationState.committed,
    confirmationInput: domainState.confirmationInput,
    currentBlockHeight: searchState.currentBlockHeight,
    displayName: namePreview.displayName,
    managedName: domainState.managedName,
    managementTxState: domainState.managementTxState,
    moonlightRecord: domainRecordState.moonlightRecord,
    nodeHex: namePreview.nodeHex,
    nowSeconds: searchState.nowSeconds,
    pendingReservations: registrationRuntime.pendingReservations,
    preparedCommit: registrationState.preparedCommit,
    primaryEndpointValue: domainState.primaryEndpointValue,
    primaryName: domainState.primaryName,
    primaryTxState: domainState.primaryTxState,
    recordDraftErrors: domainRecordState.recordDraftErrors,
    recordDraftMutations: domainRecordState.recordDraftMutations,
    recordTxState: domainState.recordTxState,
    registrationCompletion: registrationState.registrationCompletion,
    registrationTargetReady: registrationRuntime.registrationTargetReady,
    renewalTxState: domainState.renewalTxState,
    selectedAddress: walletRuntime.selectedAddress,
    selectedAuthority: walletRuntime.selectedAuthority,
    strandedCommitment: registrationState.strandedCommitment,
    subnameLabel: domainState.subnameLabel,
    subnameManager: domainState.subnameManager,
    subnames: domainState.subnames,
    subnameTxState: domainState.subnameTxState,
    txState: registrationState.txState,
    walletSigningReady: walletRuntime.walletSession.canSign,
  })

  useAppWalletDefaults({
    selectedAddress: walletRuntime.selectedAddress,
    selectedAuthority: walletRuntime.selectedAuthority,
    setManagedName: domainState.setManagedName,
    setRegistrationAddressInput: registrationState.setRegistrationAddressInput,
    setSubnameManager: domainState.setSubnameManager,
    walletAuthorized: walletRuntime.walletSession.authorized,
  })

  return {
    activityFeed,
    derivedState,
    domainRecordState,
    namePreview,
    registrationRuntime,
  }
}

export type NameWorkspaceRuntime = ReturnType<typeof useNameWorkspaceRuntime>
