import {
  buildMainViewRuntimeArgs,
  buildSearchRuntimeArgs,
} from './navigationRuntimeAdapters'
import type { AppCoreRuntimes } from './useAppCoreRuntimes'
import type { NameWorkspaceRuntime } from './useNameWorkspaceRuntime'
import { useMainViewRuntime } from './useMainViewRuntime'
import { useSearchRuntime } from './useSearchRuntime'

export function useAppNavigationRuntimes({
  core,
  workspace,
}: {
  core: AppCoreRuntimes
  workspace: NameWorkspaceRuntime
}) {
  const searchRuntime = useSearchRuntime(buildSearchRuntimeArgs({ core, workspace }))
  const mainViewRuntime = useMainViewRuntime(buildMainViewRuntimeArgs({
    core,
    searchRuntime,
    workspace,
  }))

  return {
    mainViewRuntime,
    searchRuntime,
  }
}

export type AppNavigationRuntimes = ReturnType<typeof useAppNavigationRuntimes>
