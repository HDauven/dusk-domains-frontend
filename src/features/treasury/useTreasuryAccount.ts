import { useSingleFlight } from '../../app/useSingleFlight'
import { createNameReadGuard } from '../search/nameReadGuard'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DuskDomainsIndexerClient, IndexedTreasuryState } from '../../names/internal'
import { emptyTreasuryUiState } from './treasuryState'

export function useTreasuryAccount(indexerClient: DuskDomainsIndexerClient | null) {
  const [treasuryState, setTreasuryState] = useState<IndexedTreasuryState>(() => emptyTreasuryUiState())
  const [treasuryLoaded, setTreasuryLoaded] = useState(false)
  const [treasuryLoading, setTreasuryLoading] = useState(false)
  const [treasuryError, setTreasuryError] = useState('')

  const loaded = useRef(treasuryLoaded)
  const beginRead = useMemo(() => createNameReadGuard(), [])
  useEffect(() => () => { beginRead() }, [beginRead, indexerClient])

  const readData = useCallback(async () => {
    const isCurrent = beginRead()
    setTreasuryLoading(false)
    if (!indexerClient) {
      setTreasuryError('Treasury data is unavailable right now.')
      return false
    }

    setTreasuryLoading(true)
    setTreasuryError('')

    try {
      const nextTreasury = await indexerClient.getTreasury()
      if (!isCurrent()) return false
      setTreasuryState(nextTreasury)
      loaded.current = true
      setTreasuryLoaded(true)
      return true
    } catch (error) {
      if (!isCurrent()) return false
      void error
      setTreasuryError(loaded.current ? "Couldn't refresh. Retrying…" : 'Treasury data is unavailable right now.')
      return false
    } finally {
      if (isCurrent()) setTreasuryLoading(false)
    }
  }, [beginRead, indexerClient])

  const loadTreasury = useSingleFlight(readData, readData)

  return {
    treasuryLoaded,
    treasuryError,
    treasuryLoading,
    treasuryState,
    loadTreasury,
    setTreasuryError,
  }
}
