import type { AppViewModelInputs } from '../appViewTypes'

export function buildRegistrationWalletProps({
  mainViewRuntime,
  walletRuntime,
}: AppViewModelInputs) {
  return {
    ...mainViewRuntime,
    ...walletRuntime,
    onOpenWalletConnection: () => void walletRuntime.handleOpenWalletConnection(),
    onRefreshWalletProviders: () => walletRuntime.handleRefreshWalletProviders(),
    onViewPendingReservation: () => void mainViewRuntime.handleMainViewChange('my-names'),
  }
}
