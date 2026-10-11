import { clearRegisteredPendingReservations } from '../../registration/clearRegisteredPendingReservations'
import { analyzeName, validateName, userFacingErrorMessage } from '../../../names/internal'
import { resetSearchState } from '../searchControllerReset'
import type { UseSearchControllerProps } from '../searchControllerTypes'

export async function openIndexedName(props: UseSearchControllerProps, name: string) {
  const { beginNameRead, hydrateNameFromIndexer, indexerClient, openSearchView, search, activity } = props

  openSearchView()
  resetSearchState(props, name)
  if (!validateName(name).ok) {
    search.open('overview')
    search.showResult(analyzeName(name))
    return
  }
  search.open(indexerClient ? 'details' : 'overview')
  if (!indexerClient) return

  activity.startLoading()
  search.startRead()

  const isCurrent = beginNameRead()
  try {
    const nextResult = await (props.searchNameFromIndexer?.(indexerClient, name) ?? indexerClient.searchName(name))
    if (!isCurrent()) return
    if (nextResult.status === 'registered') {
      clearRegisteredPendingReservations({ canonicalName: nextResult.canonical, chainId: props.chainId, loadPendingReservations: props.loadPendingReservations })
    }
    search.showView(nextResult.status === 'registered' ? 'details' : 'overview')
    await hydrateNameFromIndexer(indexerClient, nextResult, isCurrent)
    if (isCurrent()) search.showResult(nextResult)
  } catch (error) {
    if (isCurrent()) search.fail(userFacingErrorMessage(error))
  } finally {
    if (isCurrent()) activity.finishLoading()
  }
}
