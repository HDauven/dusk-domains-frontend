import type { AppCoreRuntimes } from './useAppCoreRuntimes'
import { useAppDerivedState } from './useAppDerivedState'
import { useAppWalletDefaults } from './useAppWalletDefaults'
import { useRegistrationRuntime } from './useRegistrationRuntime'
import {
  buildActivityFeedArgs,
  buildDerivedStateArgs,
  buildDomainRecordStateArgs,
  buildNamePreviewArgs,
  buildRegistrationRuntimeArgs,
  buildWalletDefaultsArgs,
} from './workspaceRuntimeAdapters'
import { useActivityFeed } from '../features/activity/useActivityFeed'
import { useDomainRecordState } from '../features/domains/useDomainRecordState'
import { useNamePreview } from '../features/search/useNamePreview'

export function useNameWorkspaceRuntime(core: AppCoreRuntimes) {
  const namePreview = useNamePreview(buildNamePreviewArgs(core))
  const activityFeed = useActivityFeed(buildActivityFeedArgs(namePreview))
  const registrationRuntime = useRegistrationRuntime(buildRegistrationRuntimeArgs({
    core,
    namePreview,
  }))
  const domainRecordState = useDomainRecordState(buildDomainRecordStateArgs({
    core,
    namePreview,
  }))
  const derivedState = useAppDerivedState(buildDerivedStateArgs({
    core,
    domainRecordState,
    namePreview,
    registrationRuntime,
  }))

  useAppWalletDefaults(buildWalletDefaultsArgs(core))

  return {
    activityFeed,
    derivedState,
    domainRecordState,
    namePreview,
    registrationRuntime,
  }
}

export type NameWorkspaceRuntime = ReturnType<typeof useNameWorkspaceRuntime>
