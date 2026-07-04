import {
  clampDurationYears,
  editableRecordKeys,
  maxDurationYears,
  minDurationYears,
} from '../appConstants'
import { fallbackManager } from '../appHelpers'
import type { AppViewModelInputs } from '../appViewTypes'

export function buildDomainManagementContextProps({
  activityFeed,
  appRuntime,
  economicsRuntime,
  namePreview,
  searchRuntime,
  searchState,
  walletRuntime,
}: AppViewModelInputs) {
  const { runtimeConfig } = appRuntime
  const { currentBlockHeight, nowSeconds, setResultView } = searchState
  const { feeConfig, feeConfigError, feeConfigLoading } = economicsRuntime
  const {
    ensureContractAuthorityForLiveWrite,
    ensurePublicBalanceForLiveWrite,
    requestSelectedShieldedAddress,
    selectedAddress,
    selectedAuthority,
    submitNameWrite,
    walletSession,
  } = walletRuntime
  const {
    displayName,
    lifecycleBaseBlockHeight,
    nodeHex,
    renewalFee,
    renewalPreviewLifecycle,
    result,
  } = namePreview
  const { shouldApplyPreviewWriteFallback } = searchRuntime
  const walletSigningReady = walletSession.canSign

  return {
    appendActivity: activityFeed.appendActivity,
    canRemoveRecords: walletSigningReady,
    clampDurationYears,
    currentBlockHeight,
    displayName,
    editableRecordKeys,
    ensureContractAuthorityForLiveWrite,
    ensurePublicBalanceForLiveWrite,
    fallbackManager,
    feeConfig,
    feeConfigError,
    feeConfigLoading,
    lifecycleBaseBlockHeight,
    maxDurationYears,
    minDurationYears,
    nodeHex,
    nowSeconds,
    onBackToDetails: () => setResultView('details'),
    renewalFee,
    renewalPreviewExpiresAt: renewalPreviewLifecycle.expiresAt,
    resultLabel: result.label,
    runtimeConfig,
    requestSelectedShieldedAddress,
    selectedAddress,
    selectedAuthority,
    shouldApplyPreviewWriteFallback,
    submitNameWrite,
    walletAuthorized: walletSigningReady,
    walletSetupState: walletSession.status,
  }
}
