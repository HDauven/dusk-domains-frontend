import type { UseSearchRuntimeArgs } from './useSearchRuntime'
import type { AppCoreRuntimes } from './useAppCoreRuntimes'
import type { NameWorkspaceRuntime } from './useNameWorkspaceRuntime'

type AppNavigationRuntimeInputs = {
  core: AppCoreRuntimes
  workspace: NameWorkspaceRuntime
}

export function buildSearchRuntimeArgs({
  core,
  workspace,
}: AppNavigationRuntimeInputs): UseSearchRuntimeArgs {
  const {
    appRuntime,
    domainState,
    registrationState,
    searchState,
    walletRuntime,
  } = core
  const {
    activityFeed,
    domainRecordState,
    namePreview,
    registrationRuntime,
  } = workspace
  const {
    indexerClient,
    liveDuskDomainsApp,
    recordSourceContractId,
  } = appRuntime
  const { currentBlockHeight, nowSeconds, query } = searchState
  const {
    setApiSearchResult,
    setChecked,
    setCurrentBlockHeight,
    setIndexerConfirmation,
    setIndexerError,
    setMainView,
    setQuery,
    setResultView,
  } = searchState
  const {
    setCommitTxState,
    setCommitted,
    setDuration,
    setPreparedCommit,
    setRegisterSetsPrimary,
    setRegistrationAddressInput,
    setRegistrationCompletion,
    setRegistrationStep,
    setTxState,
  } = registrationState
  const {
    setConfirmationInput,
    setDelegateManager,
    setDelegateSubnameNode,
    setDraftManager,
    setDraftOwner,
    setDraftResolver,
    setManagedName,
    setManagementError,
    setManagementTxState,
    setPrimaryEndpointValue,
    setPrimaryError,
    setPrimaryName,
    setPrimaryTxState,
    setRecordError,
    setRecordTxState,
    setRenewalError,
    setRenewalTxState,
    setRenewalYears,
    setSubnameError,
    setSubnameExpiryDate,
    setSubnameExpiryPolicy,
    setSubnameLabel,
    setSubnameManager,
    setSubnameResolver,
    setSubnameRevocationPolicy,
    setSubnames,
    setSubnameTxState,
  } = domainState
  const {
    setCriticalRecordConfirmation,
    setPublicRecordAcknowledged,
    setRecordDrafts,
    setRecordTargetNode,
    setResolverRecordSets,
  } = domainRecordState
  const { displayName } = namePreview
  const { loadPendingReservations } = registrationRuntime
  const { selectedAuthority } = walletRuntime

  return {
    chainId: appRuntime.runtimeConfig.chainId,
    currentBlockHeight,
    displayName,
    getCurrentBlockHeight: appRuntime.getCurrentBlockHeight,
    indexerClient,
    liveDuskDomainsApp,
    loadPendingReservations,
    nowSeconds,
    openSearchView: () => setMainView('search'),
    query,
    recordSourceContractId,
    selectedAuthority,
    setActivityEntries: activityFeed.setActivityEntries,
    setActivityLoading: activityFeed.setActivityLoading,
    setApiSearchResult,
    setChecked,
    setCommitTxState,
    setCommitted,
    setConfirmationInput,
    setCriticalRecordConfirmation,
    setCurrentBlockHeight,
    setDelegateManager,
    setDelegateSubnameNode,
    setDuration,
    setDraftManager,
    setDraftOwner,
    setDraftResolver,
    setIndexerConfirmation,
    setIndexerError,
    setManagedName,
    setManagementError,
    setManagementTxState,
    setPrimaryEndpointValue,
    setPrimaryError,
    setPrimaryName,
    setPrimaryTxState,
    setPreparedCommit,
    setPublicRecordAcknowledged,
    setQuery,
    setRecordDrafts,
    setRecordError,
    setRecordTargetNode,
    setRecordTxState,
    setRegisterSetsPrimary,
    setRegistrationAddressInput,
    setRegistrationCompletion,
    setRegistrationStep,
    setRenewalError,
    setRenewalTxState,
    setRenewalYears,
    setResolverRecordSets,
    setResultView,
    setSubnameError,
    setSubnameExpiryDate,
    setSubnameExpiryPolicy,
    setSubnameLabel,
    setSubnameManager,
    setSubnameResolver,
    setSubnameRevocationPolicy,
    setSubnameTxState,
    setSubnames,
    setTxState,
  }
}
