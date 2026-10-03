import { userFacingErrorMessage } from '../../../names/internal'
import { clearRegisteredPendingReservations } from '../../registration/clearRegisteredPendingReservations'
import type { UseSearchControllerProps } from '../searchControllerTypes'

export async function checkAvailability(props: UseSearchControllerProps) {
  const { beginNameRead, chainId, hydrateNameFromIndexer, indexerClient, loadPendingReservations, query,
    search, registration, domain, activity } = props

  domain.clearName()
  search.open('overview')
  search.showResult(null)
  registration.review()
  if (!indexerClient) return

  activity.startLoading()
  search.startRead()

  const isCurrent = beginNameRead()
  try {
    const nextResult = await (props.searchNameFromIndexer?.(indexerClient, query) ?? indexerClient.searchName(query))
    if (!isCurrent()) return
    search.showResult(nextResult)
    await hydrateNameFromIndexer(indexerClient, nextResult, isCurrent)
    if (!isCurrent()) return
    if (nextResult.status === 'registered') {
      clearRegisteredPendingReservations({ canonicalName: nextResult.canonical, chainId, loadPendingReservations })
      registration.clearCompleted()
    }
  } catch (error) {
    if (isCurrent()) search.fail(userFacingErrorMessage(error))
  } finally {
    if (isCurrent()) activity.finishLoading()
  }
}
