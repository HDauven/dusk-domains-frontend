import type { AppViewModelInputs } from './appViewTypes'
import type { UseDomainManagementFeatureProps } from '../features/domains/domainManagementFeatureTypes'
import { clampDurationYears, editableRecordKeys, maxDurationYears, minDurationYears } from './appConstants'

export function buildDomainManagementFeatureProps(inputs: AppViewModelInputs): UseDomainManagementFeatureProps {
  const { activityFeed, appRuntime, economicsRuntime, namePreview, searchRuntime, searchState, walletRuntime } = inputs

  return {
    ...inputs.derivedState,
    ...activityFeed,
    ...appRuntime,
    ...economicsRuntime,
    ...namePreview,
    ...searchRuntime,
    ...searchState,
    ...walletRuntime,
    clampDurationYears,
    editableRecordKeys,
    maxDurationYears,
    minDurationYears,
    renewalPreviewExpiresAt: namePreview.renewalPreviewLifecycle.expiresAt,
    resultLabel: namePreview.result.label,
    walletAuthorized: walletRuntime.walletSession.canSign,
    walletSetupState: walletRuntime.walletSession.status,
    ...inputs.domainState,
    ...inputs.domainRecordState,
  }
}
