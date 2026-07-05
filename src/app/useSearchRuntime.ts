import type { DuskConnectAppLike } from '../names/internal'
import { useIndexedNameHydration } from '../features/search/useIndexedNameHydration'
import type { UseIndexedNameHydrationProps } from '../features/search/indexedNameHydrationTypes'
import { useSearchController } from '../features/search/useSearchController'
import type { UseSearchControllerProps } from '../features/search/searchControllerTypes'
import { useIndexerWriteFallback } from './useIndexerWriteFallback'

export type UseSearchRuntimeArgs =
  & UseIndexedNameHydrationProps
  & Omit<UseSearchControllerProps, 'hydrateNameFromIndexer'>
  & {
    liveDuskDomainsApp: DuskConnectAppLike | null
  }

export function useSearchRuntime({
  liveDuskDomainsApp,
  ...props
}: UseSearchRuntimeArgs) {
  const {
    hydrateNameFromIndexer,
    refreshCurrentNameFromIndexer,
  } = useIndexedNameHydration(props)

  const shouldApplyPreviewWriteFallback = useIndexerWriteFallback({
    indexerClient: props.indexerClient,
    liveDuskDomainsApp,
    refreshCurrentNameFromIndexer,
    setIndexerConfirmation: props.setIndexerConfirmation,
    setIndexerError: props.setIndexerError,
  })

  const searchController = useSearchController({
    ...props,
    hydrateNameFromIndexer,
  })

  return {
    ...searchController,
    shouldApplyPreviewWriteFallback,
  }
}
