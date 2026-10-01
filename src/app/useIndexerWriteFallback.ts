import { useCallback, useLayoutEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import {
  waitForConfirmedIndexerRefresh,
  userFacingMessageFromText,
  type DuskConnectAppLike,
  type DuskDomainsIndexerClient,
} from '../names/internal'

export type ConfirmedWriteFallback = ReturnType<typeof useIndexerWriteFallback>

type UseIndexerWriteFallbackArgs = {
  displayName: string
  indexerClient: DuskDomainsIndexerClient | null
  liveDuskDomainsApp: DuskConnectAppLike | null
  refreshCurrentNameFromIndexer: (options?: { fresh?: boolean }) => Promise<boolean>
  setIndexerConfirmation: Dispatch<SetStateAction<string>>
  setIndexerError: Dispatch<SetStateAction<string>>
}

export function useIndexerWriteFallback({
  displayName,
  indexerClient,
  liveDuskDomainsApp,
  refreshCurrentNameFromIndexer,
  setIndexerConfirmation,
  setIndexerError,
}: UseIndexerWriteFallbackArgs) {
  const currentName = useRef(displayName)
  useLayoutEffect(() => { currentName.current = displayName }, [displayName])
  const shouldApplyPreviewWriteFallback = useCallback(async (
    description = 'the latest change',
    check?: (client: DuskDomainsIndexerClient) => Promise<boolean>,
    isWorkspaceCurrent?: () => boolean,
  ): Promise<boolean | null> => {
    const isCurrent = () => currentName.current === displayName && isWorkspaceCurrent?.() !== false
    if (!isCurrent()) return null
    // True applies a preview; false confirms live data; null keeps the change pending.
    if (!liveDuskDomainsApp) return true

    if (!indexerClient) {
      setIndexerError(`Transaction confirmed, but ${description} cannot be refreshed yet. Check again shortly.`)
      return null
    }

    setIndexerError('')
    setIndexerConfirmation(`Waiting for Dusk Domains to confirm ${description}.`)

    const confirmation = await waitForConfirmedIndexerRefresh({
      description,
      attempts: 15,
      delayMs: 1_000,
      check: async () => !isCurrent() ? true : check ? await check(indexerClient) : await refreshCurrentNameFromIndexer(),
      refresh: () => isCurrent() ? refreshCurrentNameFromIndexer({ fresh: true }) : Promise.resolve(false),
    })

    if (!isCurrent()) return null
    if (confirmation.confirmed && confirmation.refreshed) {
      setIndexerConfirmation(`Dusk Domains confirmed ${description}.`)
      return false
    }

    setIndexerConfirmation('')
    setIndexerError(confirmation.indexerConfirmed && !confirmation.refreshed && !confirmation.error
      ? 'Transaction confirmed, but the latest name data could not be refreshed yet.'
      : confirmation.error
        ? `Transaction confirmed, but ${description} is still syncing: ${userFacingMessageFromText(confirmation.error)}`
        : `Transaction confirmed, but ${description} is still syncing.`)
    return null
  }, [
    displayName,
    indexerClient,
    liveDuskDomainsApp,
    refreshCurrentNameFromIndexer,
    setIndexerConfirmation,
    setIndexerError,
  ])

  return shouldApplyPreviewWriteFallback
}
