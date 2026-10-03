import type { DuskConnectAppLike } from '../names/internal'
import { useIndexedNameHydration } from '../features/search/useIndexedNameHydration'
import type { UseIndexedNameHydrationProps } from '../features/search/indexedNameHydrationTypes'
import { useSearchController } from '../features/search/useSearchController'
import type { UseSearchControllerProps } from '../features/search/searchControllerTypes'
import { useIndexerWriteFallback } from './useIndexerWriteFallback'

export type UseSearchRuntimeArgs =
  & UseIndexedNameHydrationProps
  & Omit<UseSearchControllerProps, 'beginNameRead' | 'hydrateNameFromIndexer' | 'searchNameFromIndexer'>
  & {
    liveDuskDomainsApp: DuskConnectAppLike | null
  }

export function useSearchRuntime({
  liveDuskDomainsApp,
  ...props
}: UseSearchRuntimeArgs) {
  const {
    beginNameRead,
    searchNameFromIndexer,
    hydrateNameFromIndexer,
    refreshCurrentNameFromIndexer,
  } = useIndexedNameHydration(props)

  const shouldApplyPreviewWriteFallback = useIndexerWriteFallback({
    displayName: props.displayName,
    indexerClient: props.indexerClient,
    liveDuskDomainsApp,
    refreshCurrentNameFromIndexer,
    setIndexerConfirmation: props.search.confirm,
    setIndexerError: props.search.fail,
  })

  const searchController = useSearchController({
    ...props,
    beginNameRead,
    searchNameFromIndexer,
    hydrateNameFromIndexer,
  })

  return {
    ...searchController,
    refreshCurrentNameFromIndexer,
    shouldApplyPreviewWriteFallback,
  }
}
