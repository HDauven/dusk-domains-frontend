import { useCallback, useState } from 'react'
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

  const loadReferralAccount = useCallback(async () => {
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
      setReferralAccountState(nextReferralState)
      return true
    } catch (error) {
      void error
      setReferralAccountState(emptyReferralUiState(selectedReferralKey))
      setReferralError('Referral rewards are unavailable right now.')
      return false
    } finally {
      setReferralLoading(false)
    }
  }, [indexerClient, selectedReferralKey])

  return {
    referralAccountState,
    referralError,
    referralLoading,
    loadReferralAccount,
    setReferralError,
  }
}
