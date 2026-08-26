import type { AppViewModelInputs } from '../appViewTypes'

export function buildRegistrationPreviewProps({
  activityFeed,
  appRuntime,
  economicsRuntime,
  namePreview,
  searchRuntime,
}: AppViewModelInputs) {
  return {
    ...activityFeed,
    ...appRuntime,
    ...economicsRuntime,
    ...namePreview,
    ...searchRuntime,
    resultIssues: namePreview.result.issues,
  }
}
