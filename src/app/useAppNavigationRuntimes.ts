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
    onChainClient: appRuntime.duskDomainsOnChainClient,
    liveDuskDomainsApp: appRuntime.liveDuskDomainsApp,
    loadPendingReservations: registrationRuntime.loadPendingReservations,
    nowSeconds: searchState.nowSeconds,
    openSearchView: () => searchState.setMainView('search'),
    query: searchState.query,
    recordSourceContractId: appRuntime.recordSourceContractId,
    selectedAddress: walletRuntime.selectedAddress,
    search: searchState.searchActions,
    registration: registrationState.searchActions,
    domain: domainState.searchActions,
    records: domainRecordState.searchActions,
    activity: activityFeed.searchActions,
  })
  const mainViewRuntime = useMainViewRuntime({
    walletStatus: walletRuntime.walletSetupState,
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
