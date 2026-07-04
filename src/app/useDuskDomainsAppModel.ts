import type { AppMainView } from './AppTypes'
import { useAppBrowserProofCapture } from './useAppBrowserProofCapture'
import { useAppCoreRuntimes } from './useAppCoreRuntimes'
import { useAppNavigationRuntimes } from './useAppNavigationRuntimes'
import { useAppViewProps } from './useAppViewProps'
import { useNameWorkspaceRuntime } from './useNameWorkspaceRuntime'

export function useDuskDomainsAppModel() {
  const core = useAppCoreRuntimes(import.meta.env)
  const workspace = useNameWorkspaceRuntime(core)
  const navigation = useAppNavigationRuntimes({ core, workspace })

  useAppBrowserProofCapture({ core, navigation, workspace })

  const {
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
    walletSetupState,
    walletState,
  } = walletRuntime
  const {
    handleMainViewChange,
    pendingReservationCount,
    pendingReservationLabel,
  } = mainViewRuntime
  const {
    handleSearchHome,
  } = searchRuntime

  const {
    mainContentProps,
    runtimeNotice,
  } = useAppViewProps({
    ...core,
    ...workspace,
    ...navigation,
  })

  return {
    mainContentProps,
    shellProps: {
      mainView,
      onMainViewChange: (view: AppMainView) => void handleMainViewChange(view),
      onOpenWallet: () => void handleOpenWalletConnection(),
      onSearchHome: handleSearchHome,
      pendingReservationCount,
      pendingReservationLabel,
      runtimeNotice,
      walletState,
      walletStatus: walletSetupState,
    },
  }
}
