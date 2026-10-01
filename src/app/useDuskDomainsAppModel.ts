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
    liveWritesAvailable: Boolean(appRuntime.liveDuskDomainsApp),
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
        featuredNames: showcase(skyNames),
        onOpenName: openName,
      },
    },
    shellProps: {
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
