import { useCallback } from 'react'
import type {
  DuskDomainsIndexerClient,
  NameResult,
} from '../../names/internal'
import { userFacingErrorMessage } from '../../names/internal'
import { applyIndexedNameHydration } from './applyIndexedNameHydration'
import { readIndexedName } from './indexedNameReads'
import type { UseIndexedNameHydrationProps } from './indexedNameHydrationTypes'

export function useIndexedNameHydration(props: UseIndexedNameHydrationProps) {
  const {
    displayName,
    indexerClient,
    setActivityLoading,
    setApiSearchResult,
    setIndexerConfirmation,
    setIndexerError,
  } = props

  const hydrateNameFromIndexer = useCallback(async (
    client: DuskDomainsIndexerClient,
    searchResult: NameResult,
  ) => {
    const reads = await readIndexedName(client, searchResult)
    if (reads) applyIndexedNameHydration(props, reads)
  }, [props])

  const refreshCurrentNameFromIndexer = useCallback(async () => {
    if (!indexerClient) return false

    setActivityLoading(true)
    setIndexerError('')
    setIndexerConfirmation('')

    try {
      const nextResult = await indexerClient.searchName(displayName)
      setApiSearchResult(nextResult)
      await hydrateNameFromIndexer(indexerClient, nextResult)
      return true
    } catch (error) {
      setIndexerError(userFacingErrorMessage(error))
      return false
    } finally {
      setActivityLoading(false)
    }
  }, [
    displayName,
    hydrateNameFromIndexer,
    indexerClient,
    setActivityLoading,
    setApiSearchResult,
    setIndexerConfirmation,
    setIndexerError,
  ])

  return {
    hydrateNameFromIndexer,
    refreshCurrentNameFromIndexer,
  }
}
