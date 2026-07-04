import { useCallback, useEffect, useRef, useState } from 'react'
import { currentBlockHeightFromHealth } from '../../app/appHelpers'
import {
  userFacingErrorMessage,
  type DuskNamesIndexerClient,
  type IndexedNameSummary,
} from '../../names/internal'
import { myNamePrimarySummaryFromIndex } from './domainFormat'
import { fetchWalletScopedNames } from './myDomainsData'
import type { MyNamePrimarySummary } from './MyDomainsView'

type UseMyDomainsArgs = {
  indexerClient: DuskNamesIndexerClient | null
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

  const loadMyNamePrimarySummaries = useCallback(async (names: IndexedNameSummary[]) => {
    if (!indexerClient) return {}

    const entries = await Promise.all(names.map(async (name): Promise<[string, MyNamePrimarySummary]> => {
      const indexedSummary = myNamePrimarySummaryFromIndex(name)
      if (indexedSummary) return [name.node, indexedSummary]

      const moonlight = name.records.find((record) => record.key === 'moonlight_address')

      if (!moonlight) {
        return [name.node, { label: 'No address', tone: 'muted' }]
      }

      try {
        const primary = await indexerClient.getPrimaryName({
          type: 'moonlight_address',
          value: moonlight.value,
        })

        if (primary === name.canonicalName) {
          return [name.node, { label: 'Verified', tone: 'success' }]
        }

        if (primary) {
          return [name.node, { label: 'Not primary', tone: 'warning' }]
        }

        return [name.node, { label: 'No primary', tone: 'warning' }]
      } catch {
        return [name.node, { label: 'Primary unknown', tone: 'warning' }]
      }
    }))

    return Object.fromEntries(entries)
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

  const loadMyNames = useCallback(async () => {
    const requestId = myNamesRequestId.current + 1
    myNamesRequestId.current = requestId
    const shouldApply = () => myNamesRequestId.current === requestId

    setMyNamesError('')
    onLoadPendingReservations()

    if (!indexerClient) {
      setMyNames([])
      setMyNamePrimarySummaries({})
      setMyNamesLoading(false)
      setMyNamesError('Domain data is unavailable right now. Refresh and try again.')
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

  useEffect(() => {
    if (!shouldLoad) return
    globalThis.queueMicrotask(() => {
      void loadMyNames()
    })
  }, [loadMyNames, shouldLoad])

  return {
    loadMyNames,
    myNamePrimarySummaries,
    myNames,
    myNamesError,
    myNamesLoading,
  }
}
