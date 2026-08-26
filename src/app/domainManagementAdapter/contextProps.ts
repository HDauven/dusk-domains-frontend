import {
  clampDurationYears,
  editableRecordKeys,
  maxDurationYears,
  minDurationYears,
} from '../appConstants'
import { fallbackManager } from '../appHelpers'
import type { AppViewModelInputs } from '../appViewTypes'

export function buildDomainManagementContextProps(inputs: AppViewModelInputs) {
  const {
    activityFeed,
    appRuntime,
    economicsRuntime,
    namePreview,
    searchRuntime,
    searchState,
    walletRuntime,
  } = inputs

  return {
    ...activityFeed,
    ...appRuntime,
    ...economicsRuntime,
    ...namePreview,
    ...searchRuntime,
    ...searchState,
    ...walletRuntime,
    canRemoveRecords: walletRuntime.walletSession.canSign,
    clampDurationYears,
    editableRecordKeys,
    fallbackManager,
    maxDurationYears,
    minDurationYears,
    onBackToDetails: () => searchState.setResultView('details'),
    renewalPreviewExpiresAt: namePreview.renewalPreviewLifecycle.expiresAt,
    resultLabel: namePreview.result.label,
    walletAuthorized: walletRuntime.walletSession.canSign,
    walletSetupState: walletRuntime.walletSession.status,
  }
}
