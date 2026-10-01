import { clearRegisteredPendingReservations } from '../../registration/clearRegisteredPendingReservations'
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
  setResultView(indexerClient ? 'details' : 'overview')

  if (!indexerClient) return

  setActivityLoading(true)
  setIndexerError('')
  setIndexerConfirmation('')

  const isCurrent = beginNameRead()
  try {
    const nextResult = await (props.searchNameFromIndexer?.(indexerClient, name) ?? indexerClient.searchName(name))
    if (!isCurrent()) return
    if (nextResult.status === 'registered') {
      clearRegisteredPendingReservations({ canonicalName: nextResult.canonical, chainId: props.chainId, loadPendingReservations: props.loadPendingReservations })
    }
    setApiSearchResult(nextResult)
    setResultView(nextResult.status === 'registered' ? 'details' : 'overview')
    await hydrateNameFromIndexer(indexerClient, nextResult, isCurrent)
  } catch (error) {
    if (isCurrent()) setIndexerError(userFacingErrorMessage(error))
  } finally {
    if (isCurrent()) setActivityLoading(false)
  }
}
