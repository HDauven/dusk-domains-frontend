import type { UseNamePreviewArgs } from '../../features/search/useNamePreview'
import type { AppCoreRuntimes } from '../useAppCoreRuntimes'

export function buildNamePreviewArgs({
  domainState,
  economicsRuntime,
  registrationState,
  searchState,
}: AppCoreRuntimes): UseNamePreviewArgs {
  return {
    apiSearchResult: searchState.apiSearchResult,
    currentBlockHeight: searchState.currentBlockHeight,
    duration: registrationState.duration,
    feeConfig: economicsRuntime.feeConfig,
    managedNameExpiresAt: domainState.managedName.expiresAt,
    nowSeconds: searchState.nowSeconds,
    query: searchState.query,
    renewalYears: domainState.renewalYears,
  }
}
