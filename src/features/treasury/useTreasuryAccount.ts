import { useSingleFlight } from '../../app/useSingleFlight'
import { createNameReadGuard } from '../search/nameReadGuard'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DuskDomainsIndexerClient, IndexedTreasuryState } from '../../names/internal'
import { emptyTreasuryUiState } from './treasuryState'

export function useTreasuryAccount(indexerClient: DuskDomainsIndexerClient | null) {
  const [treasuryState, setTreasuryState] = useState<IndexedTreasuryState>(() => emptyTreasuryUiState())
  const [treasuryLoading, setTreasuryLoading] = useState(false)
  const [treasuryError, setTreasuryError] = useState('')

  const beginRead = useMemo(() => createNameReadGuard(), [])
  useEffect(() => () => { beginRead() }, [beginRead, indexerClient])

  const readData = useCallback(async () => {
    const isCurrent = beginRead()
    setTreasuryLoading(false)
    if (!indexerClient) {
      setTreasuryState(emptyTreasuryUiState())
      setTreasuryError('Treasury data is unavailable right now.')
      return false
    }

    setTreasuryLoading(true)
    setTreasuryError('')

    try {
      const nextTreasury = await indexerClient.getTreasury()
      if (!isCurrent()) return false
      setTreasuryState(nextTreasury)
      return true
    } catch (error) {
      if (!isCurrent()) return false
      void error
      setTreasuryError('Treasury data is not reachable right now. Trying again automatically.')
      return false
    } finally {
      if (isCurrent()) setTreasuryLoading(false)
    }
  }, [beginRead, indexerClient])

  const loadTreasury = useSingleFlight(readData, readData)

  return {
    treasuryError,
    treasuryLoading,
    treasuryState,
    loadTreasury,
    setTreasuryError,
  }
}
