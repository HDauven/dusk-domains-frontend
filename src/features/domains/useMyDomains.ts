import { useSingleFlight } from '../../app/useSingleFlight'
import { useAutoRefresh } from '../../app/useAutoRefresh'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { currentBlockHeightFromHealth } from '../../app/indexerReadHelpers'
import {
  userFacingErrorMessage,
  type DuskDomainsIndexerClient,
  type IndexedNameSummary,
} from '../../names/internal'
import { readIndexedPrimarySummaries } from './indexedPrimary'
import { fetchWalletScopedNames } from './myDomainsData'
import type { MyNamePrimarySummary } from './MyDomainsView'

type UseMyDomainsArgs = {
  indexerClient: DuskDomainsIndexerClient | null
  onBlockHeightChange: (height: number | null) => void
  onLoadPendingReservations: () => unknown
  selectedAddress: string
  selectedAuthority: string
  shouldLoad: boolean
}

export function useMyDomains({
  indexerClient,
  onBlockHeightChange,
  onLoadPendingReservations,
  selectedAddress,
  selectedAuthority,
  shouldLoad,
}: UseMyDomainsArgs) {
  const [myNames, setMyNames] = useState<IndexedNameSummary[]>([])
  const [myNamesLoading, setMyNamesLoading] = useState(false)
  const [myNamesError, setMyNamesError] = useState('')
  const [myNamePrimarySummaries, setMyNamePrimarySummaries] = useState<Record<string, MyNamePrimarySummary>>({})
  const myNamesRequestId = useRef(0)

  useLayoutEffect(() => () => { myNamesRequestId.current++ }, [indexerClient, selectedAddress, selectedAuthority])

  const loadMyNamePrimarySummaries = useCallback(async (names: IndexedNameSummary[]) => {
    return indexerClient ? readIndexedPrimarySummaries(indexerClient, names) : {}
  }, [indexerClient])

  const setLoadedMyNames = useCallback(async (
    names: IndexedNameSummary[],
    shouldApply: () => boolean = () => true,
  ) => {
    const summaries = await loadMyNamePrimarySummaries(names)
    if (!shouldApply()) return
    setMyNames(names)
    setMyNamePrimarySummaries(summaries)
  }, [loadMyNamePrimarySummaries])

  const readData = useCallback(async () => {
    const requestId = myNamesRequestId.current + 1
    myNamesRequestId.current = requestId
    const shouldApply = () => myNamesRequestId.current === requestId

    setMyNamesError('')
    onLoadPendingReservations()

    if (!indexerClient) {
      setMyNames([])
      setMyNamePrimarySummaries({})
      setMyNamesLoading(false)
      setMyNamesError('Name data is unavailable right now. Trying again automatically.')
      return
    }

    setMyNamesLoading(true)

    try {
      const health = await indexerClient.getHealth()
      if (shouldApply()) onBlockHeightChange(currentBlockHeightFromHealth(health))

      if (!selectedAddress) {
        await setLoadedMyNames([], shouldApply)
        return
      }

      const ownedNames = await fetchWalletScopedNames({
        indexerClient,
        selectedAddress,
        selectedAuthority,
      })
      await setLoadedMyNames(ownedNames, shouldApply)
    } catch (error) {
      if (shouldApply()) setMyNamesError(userFacingErrorMessage(error))
    } finally {
      if (shouldApply()) setMyNamesLoading(false)
    }
  }, [
    indexerClient,
    onBlockHeightChange,
    onLoadPendingReservations,
    selectedAddress,
    selectedAuthority,
    setLoadedMyNames,
  ])

  const loadMyNames = useSingleFlight(readData, readData)

  useEffect(() => {
    if (!shouldLoad) return
    globalThis.queueMicrotask(() => {
      void loadMyNames()
    })
  }, [loadMyNames, shouldLoad])

  useAutoRefresh(loadMyNames, shouldLoad)

  return {
    loadMyNames,
    myNamePrimarySummaries,
    myNames,
    myNamesError,
    myNamesLoading,
  }
}
