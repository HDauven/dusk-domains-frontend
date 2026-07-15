import {
  userFacingErrorMessage,
} from '../../../names/internal'
import { clearRegisteredPendingReservations } from '../../registration/clearRegisteredPendingReservations'
import type { UseSearchControllerProps } from '../searchControllerTypes'

export async function checkAvailability(props: UseSearchControllerProps) {
  const {
    chainId,
    hydrateNameFromIndexer,
    indexerClient,
    loadPendingReservations,
    query,
    setActivityLoading,
    setApiSearchResult,
    setChecked,
    setCommitted,
    setIndexerConfirmation,
    setIndexerError,
    setPreparedCommit,
    setRegistrationCompletion,
    setRegistrationStep,
    setResultView,
  } = props

  setChecked(true)
  setResultView('overview')
  setRegistrationStep('duration')
  if (!indexerClient) return

  setActivityLoading(true)
  setIndexerError('')
  setIndexerConfirmation('')

  try {
    const nextResult = await indexerClient.searchName(query)
    setApiSearchResult(nextResult)
    await hydrateNameFromIndexer(indexerClient, nextResult)
    if (nextResult.status === 'registered') {
      clearRegisteredPendingReservations({
        canonicalName: nextResult.canonical,
        chainId,
        loadPendingReservations,
      })
      setCommitted(false)
      setPreparedCommit(null)
      setRegistrationCompletion(null)
      setResultView('details')
    }
  } catch (error) {
    setIndexerError(userFacingErrorMessage(error))
  } finally {
    setActivityLoading(false)
  }
}
