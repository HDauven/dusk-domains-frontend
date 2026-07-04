import {
  userFacingErrorMessage,
} from '../../../names/internal'
import type { UseSearchControllerProps } from '../searchControllerTypes'

export async function checkAvailability(props: UseSearchControllerProps) {
  const {
    hydrateNameFromIndexer,
    indexerClient,
    query,
    setActivityLoading,
    setApiSearchResult,
    setChecked,
    setIndexerConfirmation,
    setIndexerError,
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
  } catch (error) {
    setIndexerError(userFacingErrorMessage(error))
  } finally {
    setActivityLoading(false)
  }
}
