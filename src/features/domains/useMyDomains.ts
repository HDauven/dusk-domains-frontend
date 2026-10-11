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
import { fetchMyHoldings, servesHolderIndex, type HeldListing, type HeldSubname } from './myDomainsData'
import type { MyNamePrimarySummary } from './MyDomainsView'

type UseMyDomainsArgs = {
  chainId?: string
  indexerClient: DuskDomainsIndexerClient | null
  onBlockHeightChange: (height: number | null) => void
  onLoadPendingReservations: () => unknown
  selectedAddress: string
  selectedAuthority: string
  shouldLoad: boolean
}

export function useMyDomains({
  chainId = '',
  indexerClient,
  onBlockHeightChange,
  onLoadPendingReservations,
  selectedAddress,
  selectedAuthority,
  shouldLoad,
}: UseMyDomainsArgs) {
  const [myNames, setMyNames] = useState<IndexedNameSummary[]>([])
  const [myListings, setMyListings] = useState<HeldListing[]>([])
  const [mySubnames, setMySubnames] = useState<HeldSubname[]>([])
  const [listingsUnavailable, setListingsUnavailable] = useState(false)
  const [myNamesLoading, setMyNamesLoading] = useState(false)
  const [myNamesError, setMyNamesError] = useState('')
  const [myNamePrimarySummaries, setMyNamePrimarySummaries] = useState<Record<string, MyNamePrimarySummary>>({})
  const myNamesRequestId = useRef(0)

  useLayoutEffect(() => () => { myNamesRequestId.current++ }, [indexerClient, selectedAddress, selectedAuthority])

  const loadMyNamePrimarySummaries = useCallback(async (names: IndexedNameSummary[]) => {
    return indexerClient ? readIndexedPrimarySummaries(indexerClient, names) : {}
  }, [indexerClient])

  const setLoadedMyNames = useCallback(async (
    { names, listings, subnames, listingsUnavailable: unavailable = false }: { names: IndexedNameSummary[], listings: HeldListing[], subnames: HeldSubname[], listingsUnavailable?: boolean },
    shouldApply: () => boolean = () => true,
  ) => {
    const summaries = await loadMyNamePrimarySummaries(names)
    if (!shouldApply()) return
    setMyNames(names)
    setMyListings(listings)
    setMySubnames(subnames)
    setListingsUnavailable(unavailable)
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
      setMyListings([])
      setMySubnames([])
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
        await setLoadedMyNames({ names: [], listings: [], subnames: [] }, shouldApply)
        return
      }

      const holdings = await fetchMyHoldings({
        indexerClient,
        selectedAddress,
        selectedAuthority,
        chainId,
        holderIndex: servesHolderIndex(health),
      })
      await setLoadedMyNames(holdings, shouldApply)
    } catch (error) {
      if (shouldApply()) setMyNamesError(userFacingErrorMessage(error))
    } finally {
      if (shouldApply()) setMyNamesLoading(false)
    }
  }, [
    chainId,
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
    listingsUnavailable,
    loadMyNames,
    myNamePrimarySummaries,
    myListings,
    myNames,
    myNamesError,
    myNamesLoading,
    mySubnames,
  }
}
