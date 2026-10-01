import { useSingleFlight } from '../../app/useSingleFlight'
import { createNameReadGuard } from '../search/nameReadGuard'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DuskDomainsIndexerClient, IndexedReferralState } from '../../names/internal'
import { emptyReferralUiState } from './referralState'

type UseReferralAccountArgs = {
  indexerClient: DuskDomainsIndexerClient | null
  selectedReferralKey: string
}

export function useReferralAccount({
  indexerClient,
  selectedReferralKey,
}: UseReferralAccountArgs) {
  const [referralAccountState, setReferralAccountState] = useState<IndexedReferralState>(() => emptyReferralUiState())
  const [referralLoading, setReferralLoading] = useState(false)
  const [referralError, setReferralError] = useState('')

  const beginRead = useMemo(() => createNameReadGuard(), [])
  useEffect(() => () => { beginRead() }, [beginRead, indexerClient, selectedReferralKey])

  const readData = useCallback(async () => {
    const isCurrent = beginRead()
    setReferralLoading(false)
    if (!selectedReferralKey) {
      setReferralAccountState(emptyReferralUiState())
      setReferralError('')
      return false
    }

    if (!indexerClient) {
      setReferralAccountState(emptyReferralUiState(selectedReferralKey))
      setReferralError('Referral rewards are unavailable right now.')
      return false
    }

    setReferralLoading(true)
    setReferralError('')

    try {
      const nextReferralState = await indexerClient.getReferralState(selectedReferralKey)
      if (!isCurrent()) return false
      setReferralAccountState(nextReferralState)
      return true
    } catch (error) {
      if (!isCurrent()) return false
      void error
      setReferralAccountState(emptyReferralUiState(selectedReferralKey))
      setReferralError('Referral rewards are unavailable right now.')
      return false
    } finally {
      if (isCurrent()) setReferralLoading(false)
    }
  }, [beginRead, indexerClient, selectedReferralKey])

  const loadReferralAccount = useSingleFlight(readData, readData)

  return {
    referralAccountState,
    referralError,
    referralLoading,
    loadReferralAccount,
    setReferralError,
  }
}
