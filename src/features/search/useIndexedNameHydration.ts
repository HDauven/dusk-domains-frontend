import { useCallback, useMemo } from 'react'
import { safeNamehashHex } from '../domains/domainFormat'
import { currentBlockHeightFromHealth } from '../../app/appHelpers'
import type {
  DuskDomainsIndexerClient,
  NameResult,
} from '../../names/internal'
import { userFacingErrorMessage } from '../../names/internal'
import { applyIndexedNameHydration } from './applyIndexedNameHydration'
import { readIndexedName } from './indexedNameReads'
import { createNameReadGuard } from './nameReadGuard'
import type { UseIndexedNameHydrationProps } from './indexedNameHydrationTypes'

export function useIndexedNameHydration(props: UseIndexedNameHydrationProps) {
  const {
    displayName,
    indexerClient,
    setActivityLoading,
    setApiSearchResult,
    setIndexerConfirmation,
    setIndexerError,
  } = props

  const beginNameRead = useMemo(() => createNameReadGuard(), [])

  const hydrateNameFromIndexer = useCallback(async (
    client: DuskDomainsIndexerClient,
    searchResult: NameResult,
    isCurrent: () => boolean = () => true,
  ) => {
    const isCurrentActivity = props.beginActivityRead(safeNamehashHex(searchResult.canonical))
    const isCurrentOwnership = props.beginOwnershipRead(safeNamehashHex(searchResult.canonical))
    const shouldApply = () => isCurrent() && isCurrentActivity() && isCurrentOwnership()
    const health = await client.getHealth()
    if (!shouldApply()) return
    if (!health.ok) throw new Error('Name data is still syncing. Refresh and try again shortly.')
    const currentBlockHeight = currentBlockHeightFromHealth(health)
    const reads = await readIndexedName(client, searchResult)
    if (!shouldApply()) return
    props.setCurrentBlockHeight(currentBlockHeight)
    if (reads) applyIndexedNameHydration({ ...props, currentBlockHeight }, reads)
  }, [props])

  const refreshCurrentNameFromIndexer = useCallback(async () => {
    if (!indexerClient) return false

    setActivityLoading(true)
    setIndexerError('')
    setIndexerConfirmation('')

    const isCurrent = beginNameRead()
    try {
      const nextResult = await indexerClient.searchName(displayName)
      if (!isCurrent()) return false
      setApiSearchResult(nextResult)
      await hydrateNameFromIndexer(indexerClient, nextResult, isCurrent)
      return isCurrent()
    } catch (error) {
      if (isCurrent()) setIndexerError(userFacingErrorMessage(error))
      return false
    } finally {
      if (isCurrent()) setActivityLoading(false)
    }
  }, [
    beginNameRead,
    displayName,
    hydrateNameFromIndexer,
    indexerClient,
    setActivityLoading,
    setApiSearchResult,
    setIndexerConfirmation,
    setIndexerError,
  ])

  return {
    beginNameRead,
    hydrateNameFromIndexer,
    refreshCurrentNameFromIndexer,
  }
}
