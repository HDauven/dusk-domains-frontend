import type { AppViewModelInputs } from './appViewTypes'
import { openRegisteredName } from '../features/registration/openRegisteredName'
import type { UseRegistrationFeatureProps } from '../features/registration/useRegistrationFeature'

// Registration reads from nearly every runtime; spreading them keeps the list in one place.
export function buildRegistrationFeatureProps(inputs: AppViewModelInputs): UseRegistrationFeatureProps {
  const {
    activityFeed, appRuntime, derivedState, domainRecordState, domainState, economicsRuntime, mainViewRuntime,
    namePreview, registrationRuntime, registrationState, searchRuntime, searchState, walletRuntime,
  } = inputs

  // Later spreads win, so the order matters: it matches the adapters this replaced.
  return {
    ...activityFeed,
    ...appRuntime,
    ...economicsRuntime,
    ...namePreview,
    ...searchRuntime,
    resultIssues: namePreview.result.issues,
    ...appRuntime,
    ...derivedState,
    ...registrationRuntime,
    ...domainRecordState,
    ...domainState,
    ...registrationState,
    ...searchState,
    onBackToOverview: () => searchState.setResultView('overview'),
    onSetAddress: () => void openRegisteredName(appRuntime.indexerClient, namePreview.displayName, searchRuntime.openIndexedName),
    showReservationRecovery: Boolean(registrationState.committed && registrationState.preparedCommit && !derivedState.reservationStranded),
    ...mainViewRuntime,
    ...walletRuntime,
    onOpenWalletConnection: () => void walletRuntime.handleOpenWalletConnection(),
    onRefreshWalletProviders: () => walletRuntime.handleRefreshWalletProviders(),
    onViewPendingReservation: () => void mainViewRuntime.handleMainViewChange('my-names'),
  }
}
