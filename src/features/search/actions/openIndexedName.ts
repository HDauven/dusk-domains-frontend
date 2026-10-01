import {
  userFacingErrorMessage,
} from '../../../names/internal'
import { resetSearchState } from '../searchControllerReset'
import type { UseSearchControllerProps } from '../searchControllerTypes'

export async function openIndexedName(props: UseSearchControllerProps, name: string) {
  const {
    beginNameRead,
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

  const isCurrent = beginNameRead()
  try {
    const nextResult = await indexerClient.searchName(name)
    if (!isCurrent()) return
    setApiSearchResult(nextResult)
    await hydrateNameFromIndexer(indexerClient, nextResult, isCurrent)
  } catch (error) {
    if (isCurrent()) setIndexerError(userFacingErrorMessage(error))
  } finally {
    if (isCurrent()) setActivityLoading(false)
  }
}
