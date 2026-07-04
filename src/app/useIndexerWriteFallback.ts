import { useCallback, type Dispatch, type SetStateAction } from 'react'
import {
  waitForConfirmedIndexerRefresh,
  userFacingMessageFromText,
  type DuskConnectAppLike,
  type DuskNamesIndexerClient,
} from '../names/internal'

type UseIndexerWriteFallbackArgs = {
  indexerClient: DuskNamesIndexerClient | null
  liveDuskNamesApp: DuskConnectAppLike | null
  refreshCurrentNameFromIndexer: () => Promise<boolean>
  setIndexerConfirmation: Dispatch<SetStateAction<string>>
  setIndexerError: Dispatch<SetStateAction<string>>
}

export function useIndexerWriteFallback({
  indexerClient,
  liveDuskNamesApp,
  refreshCurrentNameFromIndexer,
  setIndexerConfirmation,
  setIndexerError,
}: UseIndexerWriteFallbackArgs) {
  const shouldApplyPreviewWriteFallback = useCallback(async (
    description = 'the latest change',
    check?: (client: DuskNamesIndexerClient) => Promise<boolean>,
  ) => {
    if (!liveDuskNamesApp) return true

    if (!indexerClient) {
      setIndexerError(`Transaction confirmed, but ${description} cannot be refreshed yet. Check again shortly.`)
      return false
    }

    setIndexerError('')
    setIndexerConfirmation(`Waiting for Dusk Domains to confirm ${description}.`)

    const confirmation = await waitForConfirmedIndexerRefresh({
      description,
      attempts: 15,
      delayMs: 1_000,
      check: async () => check ? await check(indexerClient) : await refreshCurrentNameFromIndexer(),
      refresh: refreshCurrentNameFromIndexer,
    })

    if (confirmation.confirmed && confirmation.refreshed) {
      setIndexerConfirmation(`Dusk Domains confirmed ${description}.`)
      return false
    }

    setIndexerConfirmation('')
    setIndexerError(confirmation.indexerConfirmed && !confirmation.refreshed && !confirmation.error
      ? 'Transaction confirmed, but the latest domain data could not be refreshed yet.'
      : confirmation.error
        ? `Transaction confirmed, but ${description} is still syncing: ${userFacingMessageFromText(confirmation.error)}`
        : `Transaction confirmed, but ${description} is still syncing.`)
    return false
  }, [
    indexerClient,
    liveDuskNamesApp,
    refreshCurrentNameFromIndexer,
    setIndexerConfirmation,
    setIndexerError,
  ])

  return shouldApplyPreviewWriteFallback
}
