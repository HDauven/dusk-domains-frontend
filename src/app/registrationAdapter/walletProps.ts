import type { AppViewModelInputs } from '../appViewTypes'

export function buildRegistrationWalletProps({
  mainViewRuntime,
  walletRuntime,
}: AppViewModelInputs) {
  const {
    ensureContractAuthorityForLiveWrite,
    ensurePublicBalanceForLiveWrite,
    handleOpenWalletConnection,
    handleRefreshWalletProviders,
    selectedAddress,
    selectedAuthority,
    setWalletError,
    submitNameWrite,
    walletDiscoveryRefreshing,
    walletError,
    walletSetupState,
  } = walletRuntime

  return {
    ensureContractAuthorityForLiveWrite,
    ensurePublicBalanceForLiveWrite,
    onOpenWalletConnection: () => void handleOpenWalletConnection(),
    onRefreshWalletProviders: () => handleRefreshWalletProviders(),
    onViewPendingReservation: () => void mainViewRuntime.handleMainViewChange('my-names'),
    selectedAddress,
    selectedAuthority,
    setWalletError,
    submitNameWrite,
    walletDiscoveryRefreshing,
    walletError,
    walletSetupState,
  }
}
