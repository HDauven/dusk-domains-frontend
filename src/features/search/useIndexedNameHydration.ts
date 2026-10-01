import { createSingleFlight, type RefreshOptions } from '../../app/singleFlight'
import { useSingleFlight } from '../../app/useSingleFlight'
import { useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import { safeNamehashHex } from '../domains/domainFormat'
import { currentBlockHeightFromHealth } from '../../app/indexerReadHelpers'
import type {
  DuskDomainsIndexerClient,
  DuskDomainsOnChainClient,
  NameResult,
} from '../../names/internal'
import { userFacingErrorMessage } from '../../names/internal'
import { applyIndexedNameHydration } from './applyIndexedNameHydration'
import { readIndexedName } from './indexedNameReads'
import { createNameReadGuard } from './nameReadGuard'
import type { UseIndexedNameHydrationProps } from './indexedNameHydrationTypes'

async function readNameSnapshot(client: DuskDomainsIndexerClient, searchResult: NameResult, selectedAddress: string, onChainClient: DuskDomainsOnChainClient | null) {
  const health = await client.getHealth()
  if (!health.ok) throw new Error('Name data is still syncing. It will update automatically.')
  return { currentBlockHeight: currentBlockHeightFromHealth(health), reads: await readIndexedName(client, searchResult, selectedAddress, onChainClient) }
}

export function useIndexedNameHydration(props: UseIndexedNameHydrationProps) {
  const {
    displayName,
    indexerClient,
    onChainClient,
    selectedAddress,
    setActivityLoading,
    setApiSearchResult,
    setIndexerConfirmation,
    setIndexerError,
  } = props

  const refreshScope = useMemo(() => ({ displayName, indexerClient, onChainClient, selectedAddress }), [displayName, indexerClient, onChainClient, selectedAddress])
  const beginNameRead = useMemo(() => createNameReadGuard(), [])

  const currentAddress = useRef(selectedAddress)
  useLayoutEffect(() => { currentAddress.current = selectedAddress }, [selectedAddress])

  const currentName = useRef(displayName)
  useLayoutEffect(() => { currentName.current = displayName }, [displayName])

  const queryFlight = useMemo(() => createSingleFlight<NameResult>(), [])
  const hydrationFlight = useMemo(() => createSingleFlight<Awaited<ReturnType<typeof readNameSnapshot>>>(), [])
  const searchNameFromIndexer = useCallback((client: DuskDomainsIndexerClient, name: string, options?: RefreshOptions) =>
    queryFlight(() => client.searchName(name), [client, name], options?.fresh), [queryFlight])

  const hydrateNameFromIndexer = useCallback(async (
    client: DuskDomainsIndexerClient,
    searchResult: NameResult,
    isCurrent: () => boolean = () => true,
    options?: RefreshOptions,
  ) => {
    const isCurrentActivity = props.beginActivityRead(safeNamehashHex(searchResult.canonical))
    const isCurrentOwnership = props.beginOwnershipRead(safeNamehashHex(searchResult.canonical))
    const shouldApply = () => isCurrent() && isCurrentActivity() && isCurrentOwnership() && currentAddress.current === selectedAddress
    const { currentBlockHeight, reads } = await hydrationFlight(() => readNameSnapshot(client, searchResult, selectedAddress, onChainClient), [client, searchResult.canonical, selectedAddress, onChainClient], options?.fresh)
    if (!shouldApply()) return
    props.setCurrentBlockHeight(currentBlockHeight)
    if (reads) applyIndexedNameHydration({ ...props, currentBlockHeight }, reads)
  }, [hydrationFlight, props, selectedAddress, onChainClient])

  const readData = useCallback(async (options?: RefreshOptions) => {
    if (!indexerClient) return false

    setActivityLoading(true)
    setIndexerError('')
    setIndexerConfirmation('')

    const isLatestRead = beginNameRead()
    const isCurrent = () => isLatestRead() && currentName.current === displayName && currentAddress.current === selectedAddress
    try {
      const nextResult = await searchNameFromIndexer(indexerClient, displayName, options)
      if (!isCurrent()) return false
      setApiSearchResult(nextResult)
      await hydrateNameFromIndexer(indexerClient, nextResult, isCurrent, options)
      return isCurrent()
    } catch (error) {
      if (isCurrent()) setIndexerError(userFacingErrorMessage(error))
      return false
    } finally {
      if (isCurrent()) setActivityLoading(false)
    }
  }, [
    beginNameRead,
    searchNameFromIndexer,
    displayName,
    hydrateNameFromIndexer,
    indexerClient,
    selectedAddress,
    setActivityLoading,
    setApiSearchResult,
    setIndexerConfirmation,
    setIndexerError,
  ])

  const refreshCurrentNameFromIndexer = useSingleFlight(readData, refreshScope)

  return {
    searchNameFromIndexer,
    beginNameRead,
    hydrateNameFromIndexer,
    refreshCurrentNameFromIndexer,
  }
}
