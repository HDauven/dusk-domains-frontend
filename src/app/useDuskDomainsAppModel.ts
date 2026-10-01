import { useAutoRefresh } from './useAutoRefresh'
import type { DuskDomainsRuntimeConfig } from '../names/internal'
import type { AppMainView } from './AppTypes'
import type { NetworkBadge } from './TopBar'
import { useSkyNames, showcase } from './useSkyNames'
import { useUrlRoute } from './useUrlRoute'
import { useAppCoreRuntimes } from './useAppCoreRuntimes'
import { useAppNavigationRuntimes } from './useAppNavigationRuntimes'
import { useAppViewProps } from './useAppViewProps'
import { useNameWorkspaceRuntime } from './useNameWorkspaceRuntime'
import { useMarketplaceFeature } from '../features/marketplace/useMarketplaceFeature'

function networkBadge(config: DuskDomainsRuntimeConfig): NetworkBadge {
  if (config.mode !== 'live_ready') return { label: 'Preview', tone: 'preview' }
  if (config.chainId === 'dusk:1') return { label: 'Mainnet', tone: 'mainnet' }
  if (config.chainId === 'dusk:0') return { label: 'Local', tone: 'local' }
  return { label: config.chainId === 'dusk:3' ? 'Devnet' : 'Testnet', tone: 'testnet' }
}

export function useDuskDomainsAppModel() {
  const core = useAppCoreRuntimes(import.meta.env)
  const workspace = useNameWorkspaceRuntime(core)
  const navigation = useAppNavigationRuntimes({ core, workspace })

  const {
    appRuntime,
    searchState,
    walletRuntime,
  } = core
  const {
    mainViewRuntime,
    searchRuntime,
  } = navigation
  const {
    mainView,
  } = searchState
  const {
    handleOpenWalletConnection,
    ensurePublicBalanceForLiveWrite,
    selectedAddress,
    selectedAuthority,
    submitNameWrite,
    walletSetupState,
    walletState,
  } = walletRuntime
  const {
    handleMainViewChange,
  } = mainViewRuntime
  const {
    handleSearchHome,
    searchName,
  } = searchRuntime
  useAutoRefresh(searchRuntime.refreshCurrentNameFromIndexer, mainView === 'search' && searchState.checked && ['overview', 'details', 'activity', 'subnames'].includes(searchState.resultView))
  const skyNames = useSkyNames(appRuntime.indexerClient)
  const openName = (name: string) => void searchName(name)
  const openView = (view: AppMainView) => {
    if (view === 'search') handleSearchHome()
    else void handleMainViewChange(view)
  }

  const {
    mainContentProps,
    runtimeNotice,
  } = useAppViewProps({
    ...core,
    ...workspace,
    ...navigation,
  })
  const {
    marketplaceProps,
  } = useMarketplaceFeature({
    tradingPaused: appRuntime.pause.tradingPaused,
    ensurePublicBalanceForLiveWrite,
    duskDomainsOnChainClient: appRuntime.duskDomainsOnChainClient,
    indexerClient: appRuntime.indexerClient,
    marketplaceOnChainClient: appRuntime.marketplaceOnChainClient,
    liveWritesAvailable: !appRuntime.writeAccess.readOnly,
    mainView,
    onOpenWalletConnection: () => void handleOpenWalletConnection(),
    runtimeConfig: appRuntime.runtimeConfig,
    selectedAddress,
    selectedAuthority,
    submitNameWrite,
  })

  useUrlRoute({
    selectedAuctionNode: marketplaceProps.selectedAuctionNode,
    onOpenAuction: marketplaceProps.onOpenAuction,
    checked: searchState.checked,
    mainView,
    onOpenName: openName,
    onOpenView: openView,
    searchedName: searchState.apiSearchResult?.canonical ?? null,
  })

  return {
    mainContentProps: {
      ...mainContentProps,
      marketplaceProps,
      searchProps: {
        ...mainContentProps.searchProps,
        overviewProps: { ...mainContentProps.searchProps.overviewProps, readOnly: appRuntime.writeAccess.readOnly, registrationUnavailable: !appRuntime.writeAccess.canRegister },
        featuredNames: showcase(skyNames),
        onOpenName: openName,
      },
    },
    shellProps: {
      networkStatus: { config: appRuntime.runtimeConfig, client: appRuntime.indexerClient, readOnly: appRuntime.writeAccess.readOnly },
      walletDialog: {
        open: appRuntime.walletOpen,
        busy: walletRuntime.walletBusy,
        error: walletRuntime.walletError,
        status: walletSetupState,
        address: selectedAddress,
        onClose: appRuntime.connectKit.close,
        onConnect: () => void handleOpenWalletConnection(),
        onDisconnect: () => { void appRuntime.wallet.disconnect().then(appRuntime.connectKit.close).catch(error => walletRuntime.setWalletError(error instanceof Error ? error.message : 'Could not disconnect. Try again.')) },
        onReferrals: () => { appRuntime.connectKit.close(); openView('referrals') },
      },
      pause: appRuntime.pause,
      launchLinks: appRuntime.runtimeConfig.launchLinks,
      mainView,
      network: networkBadge(appRuntime.runtimeConfig),
      onOpenName: openName,
      searching: searchState.checked,
      skyNames: skyNames.map(({ name, node }) => ({ label: name, node })),
      onMainViewChange: (view: AppMainView) => void handleMainViewChange(view),
      onOpenWallet: () => void handleOpenWalletConnection(),
      onSearchHome: handleSearchHome,
      pendingReservationCount: workspace.registrationRuntime.pendingReservations.length,
      runtimeNotice,
      walletState,
      walletStatus: walletSetupState,
    },
  }
}
