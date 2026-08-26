import type { AppViewModelInputs } from '../appViewTypes'

export function buildRegistrationStateProps({
  domainRecordState,
  domainState,
  registrationState,
  searchState,
}: AppViewModelInputs) {
  return {
    ...domainRecordState,
    ...domainState,
    ...registrationState,
    ...searchState,
    onBackToOverview: () => searchState.setResultView('overview'),
    onSetAddress: () => searchState.setResultView('details'),
    showReservationRecovery: Boolean(registrationState.committed && registrationState.preparedCommit),
  }
}
