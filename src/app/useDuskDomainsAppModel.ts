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

function networkBadge(config: DuskDomainsRuntimeConfig): NetworkBadge {
  if (config.mode !== 'live_ready') return { label: 'Preview', tone: 'preview' }
  if (config.chainId === 'dusk:1') return { label: 'Mainnet', tone: 'mainnet' }
  if (config.chainId === 'dusk:0') return { label: 'Local', tone: 'local' }
  return { label: config.chainId === 'dusk:3' ? 'Devnet' : 'Testnet', tone: 'testnet' }
}

// Read once: a production build inlines import.meta.env as a new object at each use.
const appEnv = import.meta.env

export function useDuskDomainsAppModel() {
  const core = useAppCoreRuntimes(appEnv)
  const workspace = useNameWorkspaceRuntime(core)
  const navigation = useAppNavigationRuntimes({ core, workspace })

  const { appRuntime, searchState, walletRuntime } = core
  const { mainViewRuntime, searchRuntime } = navigation
  const { mainView } = searchState
  const { handleOpenWalletConnection, selectedAddress, walletSetupState, walletState } = walletRuntime
  const { handleMainViewChange } = mainViewRuntime
  const { handleSearchHome, searchName } = searchRuntime
  useAutoRefresh(searchRuntime.refreshCurrentNameFromIndexer, mainView === 'search' && searchState.checked && ['overview', 'details', 'activity', 'subnames'].includes(searchState.resultView))
  const skyNames = useSkyNames(appRuntime.indexerClient)
  const openName = (name: string) => void searchName(name)
  const openView = (view: AppMainView) => {
    if (view === 'search') handleSearchHome()
    else void handleMainViewChange(view)
  }

  const { mainContentProps, runtimeNotice, marketplace } = useAppViewProps({ ...core, ...workspace, ...navigation })

  useUrlRoute({
    sellName: marketplace.sellName,
    onOpenSell: marketplace.openSell,
    selectedAuctionNode: marketplace.marketplaceProps.auction.selectedAuctionNode,
    onOpenAuction: marketplace.marketplaceProps.auction.onOpenAuction,
    checked: searchState.checked,
    mainView,
    onOpenName: openName,
    onOpenView: openView,
    searchedName: searchState.apiSearchResult?.canonical ?? null,
  })

  return {
    mainContentProps: {
      ...mainContentProps,
      searchProps: {
        ...mainContentProps.searchProps,
        result: { ...mainContentProps.searchProps.result, overviewProps: { ...mainContentProps.searchProps.result.overviewProps, readOnly: appRuntime.writeAccess.readOnly, registrationUnavailable: !appRuntime.writeAccess.canRegister } },
        search: { ...mainContentProps.searchProps.search, featuredNames: skyNames && showcase(skyNames) },
        onOpenName: openName,
      },
    },
    shellProps: {
      pendingConfirmation: walletRuntime.pendingConfirmation,
      networkStatus: { config: appRuntime.runtimeConfig, client: appRuntime.indexerClient, readOnly: appRuntime.writeAccess.readOnly },
      pause: appRuntime.pause,
      launchLinks: appRuntime.runtimeConfig.launchLinks,
      network: networkBadge(appRuntime.runtimeConfig),
      skyNames: (skyNames ?? []).map(({ name, node }) => ({ label: name, node })),
      navigation: {
        mainView,
        onOpenName: openName,
        searching: searchState.checked,
        onMainViewChange: (view: AppMainView) => void handleMainViewChange(view),
        onSearchHome: handleSearchHome,
        pendingReservationCount: workspace.registrationRuntime.pendingReservations.length,
      },
      wallet: {
        walletState,
        walletStatus: walletSetupState,
        onOpenWallet: () => void handleOpenWalletConnection(),
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
      },
      runtimeNotice,
    },
  }
}
