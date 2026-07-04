import {
  userFacingErrorMessage,
} from '../../../names/internal'
import { resetSearchState } from '../searchControllerReset'
import type { UseSearchControllerProps } from '../searchControllerTypes'

export async function openIndexedName(props: UseSearchControllerProps, name: string) {
  const {
    hydrateNameFromIndexer,
    indexerClient,
    openSearchView,
    setActivityLoading,
    setApiSearchResult,
    setChecked,
    setIndexerConfirmation,
    setIndexerError,
    setResultView,
  } = props

  openSearchView()
  resetSearchState(props, name)
  setChecked(true)
  setResultView('details')

  if (!indexerClient) return

  setActivityLoading(true)
  setIndexerError('')
  setIndexerConfirmation('')

  try {
    const nextResult = await indexerClient.searchName(name)
    setApiSearchResult(nextResult)
    await hydrateNameFromIndexer(indexerClient, nextResult)
  } catch (error) {
    setIndexerError(userFacingErrorMessage(error))
  } finally {
    setActivityLoading(false)
  }
}
