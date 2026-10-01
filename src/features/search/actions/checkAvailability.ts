import { createManagedNameState } from '../../../app/managedNameState'
import {
  userFacingErrorMessage,
} from '../../../names/internal'
import { clearRegisteredPendingReservations } from '../../registration/clearRegisteredPendingReservations'
import type { UseSearchControllerProps } from '../searchControllerTypes'

export async function checkAvailability(props: UseSearchControllerProps) {
  const {
    beginNameRead,
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

  props.setManagedName(createManagedNameState(props.recordSourceContractId))
  setChecked(true)
  setApiSearchResult(null)
  setResultView('overview')
  setRegistrationStep('review')
  if (!indexerClient) return

  setActivityLoading(true)
  setIndexerError('')
  setIndexerConfirmation('')

  const isCurrent = beginNameRead()
  try {
    const nextResult = await (props.searchNameFromIndexer?.(indexerClient, query) ?? indexerClient.searchName(query))
    if (!isCurrent()) return
    setApiSearchResult(nextResult)
    await hydrateNameFromIndexer(indexerClient, nextResult, isCurrent)
    if (!isCurrent()) return
    if (nextResult.status === 'registered') {
      clearRegisteredPendingReservations({
        canonicalName: nextResult.canonical,
        chainId,
        loadPendingReservations,
      })
      setCommitted(false)
      setPreparedCommit(null)
      setRegistrationCompletion(null)
    }
  } catch (error) {
    if (isCurrent()) setIndexerError(userFacingErrorMessage(error))
  } finally {
    if (isCurrent()) setActivityLoading(false)
  }
}
