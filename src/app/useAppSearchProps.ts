import type { useDomainManagementFeature } from '../features/domains/useDomainManagementFeature'
import type { useRegistrationFeature } from '../features/registration/useRegistrationFeature'
import { useSearchWorkspaceFeature } from '../features/search/useSearchWorkspaceFeature'
import type { AppViewModelInputs } from './appViewTypes'

type UseAppSearchPropsArgs =
  & AppViewModelInputs
  & ReturnType<typeof useDomainManagementFeature>
  & ReturnType<typeof useRegistrationFeature>

export function useAppSearchProps({
  activityFeed,
  derivedState,
  domainRecordState,
  domainState,
  mainViewRuntime,
  namePreview,
  registrationProps,
  registrationState,
  searchRuntime,
  searchState,
  primaryProps,
  recordsProps,
  settingsProps,
  subdomainsProps,
}: UseAppSearchPropsArgs) {
  const {
    checked,
    query,
    resultView,
    setResultView,
  } = searchState
  const {
    setRegistrationStep,
  } = registrationState
  const { subnames } = domainState
  const {
    canRegister,
    displayName,
    nodeHex,
    result,
  } = namePreview
  const {
    activityEntries,
    activityLoading,
    recentWarnings,
  } = activityFeed
  const {
    parentResolverRecords,
  } = domainRecordState
  const {
    primaryVerification,
    savedReservation,
    savedReservationWindow,
  } = derivedState
  const {
    handleCheckAvailability,
    openPendingReservation,
    resetSearch,
  } = searchRuntime
  const {
    handleMainViewChange,
  } = mainViewRuntime

  return useSearchWorkspaceFeature({
    activityEntries,
    activityLoading,
    canRegister,
    checked,
    displayName,
    nodeHex,
    onCheckAvailability: () => void handleCheckAvailability(),
    onOpenPendingReservation: (reservation) => void openPendingReservation(reservation),
    onOpenPendingReservations: () => void handleMainViewChange('my-names'),
    onQueryChange: resetSearch,
    onResultViewChange: setResultView,
    onStartRegistration: () => {
      setRegistrationStep('duration')
      setResultView('register')
    },
    parentResolverRecords,
    primaryProps,
    primaryVerification,
    query,
    recentWarnings,
    recordsProps,
    registrationProps,
    resultIssues: result.issues,
    resultStatus: result.status,
    resultView,
    savedReservation,
    savedReservationWindow,
    settingsProps,
    subdomainsProps,
    subnames,
  })
}
