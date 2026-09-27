import type { AppCoreRuntimes } from './useAppCoreRuntimes'
import type { NameWorkspaceRuntime } from './useNameWorkspaceRuntime'
import { useMainViewRuntime } from './useMainViewRuntime'
import { useSearchRuntime } from './useSearchRuntime'

// Search owns the name being looked at and resets everything when it changes; the main view
// runtime owns which page is open.
export function useAppNavigationRuntimes({
  core,
  workspace,
}: {
  core: AppCoreRuntimes
  workspace: NameWorkspaceRuntime
}) {
  const { appRuntime, domainState, economicsRuntime, registrationState, searchState, walletRuntime } = core
  const { activityFeed, domainRecordState, namePreview, registrationRuntime } = workspace

  const searchRuntime = useSearchRuntime({
    chainId: appRuntime.runtimeConfig.chainId,
    currentBlockHeight: searchState.currentBlockHeight,
    displayName: namePreview.displayName,
    getCurrentBlockHeight: appRuntime.getCurrentBlockHeight,
    indexerClient: appRuntime.indexerClient,
    liveDuskDomainsApp: appRuntime.liveDuskDomainsApp,
    loadPendingReservations: registrationRuntime.loadPendingReservations,
    nowSeconds: searchState.nowSeconds,
    openSearchView: () => searchState.setMainView('search'),
    query: searchState.query,
    recordSourceContractId: appRuntime.recordSourceContractId,
    selectedAuthority: walletRuntime.selectedAuthority,
    setActivityEntries: activityFeed.setActivityEntries,
    setActivityLoading: activityFeed.setActivityLoading,
    setApiSearchResult: searchState.setApiSearchResult,
    setChecked: searchState.setChecked,
    setCommitTxState: registrationState.setCommitTxState,
    setCommitted: registrationState.setCommitted,
    setConfirmationInput: domainState.setConfirmationInput,
    setCriticalRecordConfirmation: domainRecordState.setCriticalRecordConfirmation,
    setCurrentBlockHeight: searchState.setCurrentBlockHeight,
    setDuration: registrationState.setDuration,
    setDraftManager: domainState.setDraftManager,
    setDraftOwner: domainState.setDraftOwner,
    setIndexerConfirmation: searchState.setIndexerConfirmation,
    setIndexerError: searchState.setIndexerError,
    setManagedName: domainState.setManagedName,
    setManagementError: domainState.setManagementError,
    setManagementTxState: domainState.setManagementTxState,
    setPrimaryEndpointValue: domainState.setPrimaryEndpointValue,
    setPrimaryError: domainState.setPrimaryError,
    setPrimaryName: domainState.setPrimaryName,
    setPrimaryTxState: domainState.setPrimaryTxState,
    setPreparedCommit: registrationState.setPreparedCommit,
    setPublicRecordAcknowledged: domainRecordState.setPublicRecordAcknowledged,
    setQuery: searchState.setQuery,
    setRecordDrafts: domainRecordState.setRecordDrafts,
    setRecordError: domainState.setRecordError,
    setRecordTargetNode: domainRecordState.setRecordTargetNode,
    setRecordTxState: domainState.setRecordTxState,
    setRegisterSetsPrimary: registrationState.setRegisterSetsPrimary,
    setRegistrationAddressInput: registrationState.setRegistrationAddressInput,
    setRegistrationCompletion: registrationState.setRegistrationCompletion,
    setRegistrationStep: registrationState.setRegistrationStep,
    setRenewalError: domainState.setRenewalError,
    setRenewalTxState: domainState.setRenewalTxState,
    setRenewalYears: domainState.setRenewalYears,
    setResolverRecordSets: domainRecordState.setResolverRecordSets,
    setResultView: searchState.setResultView,
    setSubnameError: domainState.setSubnameError,
    setSubnameExpiryDate: domainState.setSubnameExpiryDate,
    setSubnameExpiryPolicy: domainState.setSubnameExpiryPolicy,
    setSubnameLabel: domainState.setSubnameLabel,
    setSubnameManager: domainState.setSubnameManager,
    setSubnameResolver: domainState.setSubnameResolver,
    setSubnameRevocationPolicy: domainState.setSubnameRevocationPolicy,
    setSubnameTxState: domainState.setSubnameTxState,
    setSubnames: domainState.setSubnames,
    setTxState: registrationState.setTxState,
  })
  const mainViewRuntime = useMainViewRuntime({
    currentBlockHeight: searchState.currentBlockHeight,
    indexerClient: appRuntime.indexerClient,
    loadPendingReservations: registrationRuntime.loadPendingReservations,
    loadReferralAccount: economicsRuntime.loadReferralAccount,
    loadTreasuryView: economicsRuntime.loadTreasuryView,
    mainView: searchState.mainView,
    onConnectWallet: () => void walletRuntime.handleOpenWalletConnection(),
    onForgetPendingReservation: (reservation) => void searchRuntime.forgetPendingReservation(reservation),
    onOpenIndexedName: (name) => void searchRuntime.openIndexedName(name),
    onOpenPendingReservation: (reservation) => void searchRuntime.openPendingReservation(reservation),
    onSearchHome: searchRuntime.handleSearchHome,
    pendingReservations: registrationRuntime.pendingReservations,
    resetReferralCopied: economicsRuntime.resetReferralCopied,
    selectedAddress: walletRuntime.selectedAddress,
    selectedAuthority: walletRuntime.selectedAuthority,
    setCurrentBlockHeight: searchState.setCurrentBlockHeight,
    setMainView: searchState.setMainView,
  })

  return {
    mainViewRuntime,
    searchRuntime,
  }
}

export type AppNavigationRuntimes = ReturnType<typeof useAppNavigationRuntimes>
