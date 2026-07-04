import type { useActivityFeed } from '../features/activity/useActivityFeed'
import type { useDomainRecordState } from '../features/domains/useDomainRecordState'
import type { useNamePreview } from '../features/search/useNamePreview'
import type { useAppDerivedState } from './useAppDerivedState'
import type { useAppRuntime } from './useAppRuntime'
import type { useDomainManagementAppState } from './useDomainManagementAppState'
import type { useEconomicsRuntime } from './useEconomicsRuntime'
import type { useMainViewRuntime } from './useMainViewRuntime'
import type { useRegistrationAppState } from './useRegistrationAppState'
import type { useRegistrationRuntime } from './useRegistrationRuntime'
import type { useSearchAppState } from './useSearchAppState'
import type { useSearchRuntime } from './useSearchRuntime'
import type { useWalletRuntime } from './useWalletRuntime'

export type AppViewModelInputs = {
  activityFeed: ReturnType<typeof useActivityFeed>
  appRuntime: ReturnType<typeof useAppRuntime>
  derivedState: ReturnType<typeof useAppDerivedState>
  domainRecordState: ReturnType<typeof useDomainRecordState>
  domainState: ReturnType<typeof useDomainManagementAppState>
  economicsRuntime: ReturnType<typeof useEconomicsRuntime>
  mainViewRuntime: ReturnType<typeof useMainViewRuntime>
  namePreview: ReturnType<typeof useNamePreview>
  registrationRuntime: ReturnType<typeof useRegistrationRuntime>
  registrationState: ReturnType<typeof useRegistrationAppState>
  searchRuntime: ReturnType<typeof useSearchRuntime>
  searchState: ReturnType<typeof useSearchAppState>
  walletRuntime: ReturnType<typeof useWalletRuntime>
}
