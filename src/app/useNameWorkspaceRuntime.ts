import type { AppCoreRuntimes } from './useAppCoreRuntimes'
import { editableRecordKeys } from './appConstants'
import { deriveAppDerivedState } from './derived/deriveAppDerivedState'
import { useRegistrationRuntime } from './useRegistrationRuntime'
import { useActivityFeed } from '../features/activity/useActivityFeed'
import { useDomainRecordState } from '../features/domains/useDomainRecordState'
import { useNamePreview } from '../features/search/useNamePreview'

// Everything about the name being looked at: its preview, activity, registration and records,
// and the flags derived from them.
export function useNameWorkspaceRuntime(core: AppCoreRuntimes) {
  const { appRuntime, domainState, economicsRuntime, registrationState, searchState, walletRuntime } = core

  const namePreview = useNamePreview({
    onChainClient: appRuntime.duskDomainsOnChainClient,
    selectedAuthority: walletRuntime.selectedAuthority,
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
    startsLoading: Boolean(searchState.openingRoute.name && appRuntime.indexerClient),
    defaultName: namePreview.displayName,
    defaultNode: namePreview.nodeHex,
  })
  const registrationRuntime = useRegistrationRuntime({
    directory: appRuntime.runtimeConfig.contracts.directory.contractId,
    explicitlyDisconnected: walletRuntime.walletState.explicitlyDisconnected,
    chainId: appRuntime.runtimeConfig.chainId,
    getCurrentBlockHeight: appRuntime.getCurrentBlockHeight,
    indexerClient: appRuntime.indexerClient,
    mainView: searchState.mainView,
    preparedCommit: registrationState.preparedCommit,
    selectedAddress: walletRuntime.selectedAddress,
    selectedAuthority: walletRuntime.selectedAuthority,
    setCurrentBlockHeight: searchState.setCurrentBlockHeight,
    setNowSeconds: searchState.setNowSeconds,
    setPreparedCommit: registrationState.setPreparedCommit,
  })
  const domainRecordState = useDomainRecordState({
    displayName: namePreview.displayName,
    editableRecordKeys,
    nodeHex: namePreview.nodeHex,
  })
  const derivedState = deriveAppDerivedState({
    chainId: walletRuntime.walletState.chainId ?? '',
    registrationsPaused: appRuntime.pause.registrationsPaused,
    activeRecordTarget: domainRecordState.activeRecordTarget,
    canRegister: namePreview.canRegister && appRuntime.writeAccess.canRegister,
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
    connectedPrimaryName: domainState.connectedPrimaryName,
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


  return {
    activityFeed,
    derivedState,
    domainRecordState,
    namePreview,
    registrationRuntime,
  }
}

export type NameWorkspaceRuntime = ReturnType<typeof useNameWorkspaceRuntime>
