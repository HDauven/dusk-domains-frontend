import { useCallback, useState } from 'react'
import type { DuskNamesIndexerClient, IndexedTreasuryState } from '../../names/internal'
import { emptyTreasuryUiState } from './treasuryState'

export function useTreasuryAccount(indexerClient: DuskNamesIndexerClient | null) {
  const [treasuryState, setTreasuryState] = useState<IndexedTreasuryState>(() => emptyTreasuryUiState())
  const [treasuryLoading, setTreasuryLoading] = useState(false)
  const [treasuryError, setTreasuryError] = useState('')

  const loadTreasury = useCallback(async () => {
    if (!indexerClient) {
      setTreasuryState(emptyTreasuryUiState())
      setTreasuryError('Treasury data is unavailable right now.')
      return false
    }

    setTreasuryLoading(true)
    setTreasuryError('')

    try {
      const nextTreasury = await indexerClient.getTreasury()
      setTreasuryState(nextTreasury)
      return true
    } catch (error) {
      void error
      setTreasuryError('Treasury data is not reachable right now. Refresh and try again.')
      return false
    } finally {
      setTreasuryLoading(false)
    }
  }, [indexerClient])

  return {
    treasuryError,
    treasuryLoading,
    treasuryState,
    loadTreasury,
    setTreasuryError,
  }
}
