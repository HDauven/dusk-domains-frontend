import type { AppViewModelInputs } from '../appViewTypes'

export function buildRegistrationPreviewProps({
  activityFeed,
  appRuntime,
  economicsRuntime,
  namePreview,
  searchRuntime,
}: AppViewModelInputs) {
  const {
    indexerClient,
    liveDuskDomainsApp,
    recordSourceContractId,
    runtimeConfig,
  } = appRuntime
  const {
    activeReferral,
    appliedReferral,
    feeConfig,
    feeConfigError,
    feeConfigLoading,
  } = economicsRuntime
  const {
    canRegister,
    displayName,
    expiryDate,
    lifecycleBaseBlockHeight,
    networkFee,
    nodeHex,
    registrationFee,
    result,
    total,
  } = namePreview

  return {
    activeReferral,
    appliedReferral,
    appendActivity: activityFeed.appendActivity,
    canRegister,
    displayName,
    expiryDate,
    feeConfig,
    feeConfigError,
    feeConfigLoading,
    indexerClient,
    lifecycleBaseBlockHeight,
    liveDuskDomainsApp,
    networkFee,
    nodeHex,
    recordSourceContractId,
    registrationFee,
    result,
    resultIssues: result.issues,
    runtimeConfig,
    shouldApplyPreviewWriteFallback: searchRuntime.shouldApplyPreviewWriteFallback,
    total,
  }
}
