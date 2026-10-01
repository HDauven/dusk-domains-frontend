import type { useDomainManagementFeature } from '../features/domains/useDomainManagementFeature'
import type { useRegistrationFeature } from '../features/registration/useRegistrationFeature'
import { useSearchWorkspaceFeature } from '../features/search/useSearchWorkspaceFeature'
import { lifecycleBadgeCopy } from '../features/domains/domainFormat'
import { clampDurationYears } from './appConstants'
import type { AppViewModelInputs } from './appViewTypes'

type UseAppSearchPropsArgs =
  & AppViewModelInputs
  & ReturnType<typeof useDomainManagementFeature>
  & ReturnType<typeof useRegistrationFeature>

function paysPreviousOwner({ owner, records, selectedAddress, selectedAuthority }: {
  owner: string
  records: { key: string, value: string }[]
  selectedAddress: string
  selectedAuthority: string
}) {
  const address = records.find((record) => record.key === 'moonlight_address')?.value ?? ''
  const owns = Boolean(selectedAuthority) && owner.toLowerCase() === selectedAuthority.toLowerCase()
  return owns && address && selectedAddress && address !== selectedAddress ? address : null
}

export function useAppSearchProps({
  activityFeed,
  appRuntime,
  derivedState,
  domainRecordState,
  domainState,
  economicsRuntime,
  mainViewRuntime,
  namePreview,
  registrationProps,
  registrationState,
  searchRuntime,
  searchState,
  walletRuntime,
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
    duration,
    setDuration,
    setRegistrationStep,
  } = registrationState
  const { managedName, subnames } = domainState
  const {
    canRegister,
    displayName,
    expiryDate,
    nodeHex,
    registrationFee,
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
    hasMoreActivity: activityFeed.hasMoreActivity,
    onLoadMoreActivity: () => void activityFeed.loadMoreActivity(),
    activityEntries,
    activityLoading,
    canRegister,
    checked,
    currentBlockHeight: searchState.currentBlockHeight,
    displayName,
    duration,
    lifecycleLabel: result.status === 'registered'
      ? lifecycleBadgeCopy(displayName, managedName.expiresAt, searchState.currentBlockHeight, searchState.nowSeconds, managedName.graceEndsAt)
      : null,
    expiryDate,
    feeConfigLoading: economicsRuntime.feeConfigLoading,
    nodeHex,
    onCheckAvailability: () => void handleCheckAvailability(),
    onDurationChange: (years) => setDuration(clampDurationYears(years)),
    onOpenPendingReservation: (reservation) => void openPendingReservation(reservation),
    onOpenPendingReservations: () => void handleMainViewChange('my-names'),
    onQueryChange: resetSearch,
    onResultViewChange: setResultView,
    // The claim card already chose the term, so registration opens at the wallet step.
    onStartRegistration: () => {
      setRegistrationStep('setup')
      setResultView('register')
    },
    parentResolverRecords,
    paysPreviousOwner: paysPreviousOwner({
      owner: managedName.owner,
      records: parentResolverRecords,
      selectedAddress: walletRuntime.selectedAddress,
      selectedAuthority: walletRuntime.selectedAuthority,
    }),
    primaryProps,
    primaryVerification,
    query,
    recentWarnings,
    recordsProps,
    registrationFee,
    registrationProps,
    resultReady: !appRuntime.indexerClient || searchState.apiSearchResult !== null,
    resultIssues: result.issues,
    resultStatus: result.status,
    resultView,
    savedReservation,
    savedReservationWindow,
    settingsProps,
    subdomainsProps,
    subnames,
    viewerAuthority: walletRuntime.selectedAuthority,
  })
}
