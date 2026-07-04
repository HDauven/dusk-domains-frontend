import type { UseMainViewRuntimeArgs } from './useMainViewRuntime'
import type { useSearchRuntime } from './useSearchRuntime'
import type { AppCoreRuntimes } from './useAppCoreRuntimes'
import type { NameWorkspaceRuntime } from './useNameWorkspaceRuntime'

type SearchRuntime = ReturnType<typeof useSearchRuntime>

type AppNavigationRuntimeInputs = {
  core: AppCoreRuntimes
  workspace: NameWorkspaceRuntime
}

export function buildMainViewRuntimeArgs({
  core,
  searchRuntime,
  workspace,
}: AppNavigationRuntimeInputs & {
  searchRuntime: SearchRuntime
}): UseMainViewRuntimeArgs {
  const { appRuntime, economicsRuntime, searchState, walletRuntime } = core
  const { registrationRuntime } = workspace
  const { indexerClient } = appRuntime
  const { currentBlockHeight, mainView, setCurrentBlockHeight, setMainView } = searchState
  const { loadPendingReservations, pendingReservations } = registrationRuntime
  const { loadReferralAccount, loadTreasuryView, resetReferralCopied } = economicsRuntime
  const { selectedAddress, selectedAuthority } = walletRuntime
  const {
    forgetPendingReservation,
    handleSearchHome,
    openIndexedName,
    openPendingReservation,
  } = searchRuntime

  return {
    currentBlockHeight,
    indexerClient,
    loadPendingReservations,
    loadReferralAccount,
    loadTreasuryView,
    mainView,
    onForgetPendingReservation: (reservation) => void forgetPendingReservation(reservation),
    onOpenIndexedName: (name) => void openIndexedName(name),
    onOpenPendingReservation: (reservation) => void openPendingReservation(reservation),
    onSearchHome: handleSearchHome,
    pendingReservations,
    resetReferralCopied,
    selectedAddress,
    selectedAuthority,
    setCurrentBlockHeight,
    setMainView,
  }
}
