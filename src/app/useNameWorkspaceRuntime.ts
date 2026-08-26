import type { AppCoreRuntimes } from './useAppCoreRuntimes'
import { deriveAppDerivedState } from './derived/deriveAppDerivedState'
import { useAppWalletDefaults } from './useAppWalletDefaults'
import { useRegistrationRuntime } from './useRegistrationRuntime'
import { buildActivityFeedArgs } from './workspaceAdapters/activityFeedArgs'
import { buildDerivedStateArgs } from './workspaceAdapters/derivedStateArgs'
import { buildDomainRecordStateArgs } from './workspaceAdapters/domainRecordStateArgs'
import { buildNamePreviewArgs } from './workspaceAdapters/namePreviewArgs'
import { buildRegistrationRuntimeArgs } from './workspaceAdapters/registrationRuntimeArgs'
import { buildWalletDefaultsArgs } from './workspaceAdapters/walletDefaultsArgs'
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
  const derivedState = deriveAppDerivedState(buildDerivedStateArgs({
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
