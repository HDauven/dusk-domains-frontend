import type { Dispatch, SetStateAction } from 'react'
import {
  treasuryClaimAllReferralRewardsRuntimeCall,
  userFacingMessageFromText,
  waitForConfirmedIndexerRefresh,
  type DuskDomainCallMetadata,
  type DuskDomainTxState,
  type DuskDomainsIndexerClient,
  type DuskDomainsRuntimeConfig,
  type IndexedReferralState,
  type SubmitDuskDomainWriteOptions,
} from '../../names/internal'

type SubmitNameWrite = (
  name: string,
  call: DuskDomainCallMetadata,
  options?: SubmitDuskDomainWriteOptions,
) => Promise<DuskDomainTxState>

type UseReferralActionsProps = {
  indexerClient: DuskDomainsIndexerClient | null
  liveDuskDomainsApp: unknown
  loadReferralAccount: () => Promise<boolean>
  referralAccountState: IndexedReferralState
  referralBusy: boolean
  referralClaimable: boolean
  referralRewardClaimReady: boolean
  runtimeConfig: DuskDomainsRuntimeConfig
  selectedAddress: string
  selectedAuthority: string
  setReferralConfirmation: (message: string) => void
  setReferralError: (message: string) => void
  setReferralTxState: Dispatch<SetStateAction<DuskDomainTxState | null>>
  submitNameWrite: SubmitNameWrite
  ensureContractAuthorityForLiveWrite: (
    action: string,
    setError: (message: string) => void,
  ) => boolean
  ensurePublicBalanceForLiveWrite: (
    action: string,
    setError: (message: string) => void,
    minimumLux?: number,
    depositLux?: bigint,
  ) => Promise<boolean>
}

export function useReferralActions({
  indexerClient,
  liveDuskDomainsApp,
  loadReferralAccount,
  referralAccountState,
  referralBusy,
  referralClaimable,
  referralRewardClaimReady,
  runtimeConfig,
  selectedAddress,
  selectedAuthority,
  setReferralConfirmation,
  setReferralError,
  setReferralTxState,
  submitNameWrite,
  ensureContractAuthorityForLiveWrite,
  ensurePublicBalanceForLiveWrite,
}: UseReferralActionsProps) {
  async function handleClaimReferralRewards() {
    if (!referralClaimable || referralBusy) return

    setReferralError('')
    setReferralConfirmation('')
    if (!selectedAddress) {
      setReferralError('Connect your wallet first.')
      return
    }
    if (!referralRewardClaimReady || !liveDuskDomainsApp) {
      setReferralError('Referral reward claims are not available in this deployment.')
      return
    }
    if (!ensureContractAuthorityForLiveWrite('claim referral rewards', setReferralError)) return
    if (!(await ensurePublicBalanceForLiveWrite('claiming referral rewards', setReferralError))) return

    const beforeClaimableLux = referralAccountState.claimableLux
    const call = treasuryClaimAllReferralRewardsRuntimeCall({
      recipient: selectedAddress,
    })

    const finalState = await submitNameWrite('referrals.dusk', call, {
      contracts: runtimeConfig.contracts,
      onUpdate: setReferralTxState,
    })

    if (finalState.status !== 'executed') {
      setReferralError(finalState.message ? userFacingMessageFromText(finalState.message) : 'Referral claim was not completed.')
      return
    }

    if (!indexerClient) {
      setReferralError('Claim submitted. Reward data will refresh when available.')
      return
    }

    const confirmation = await waitForConfirmedIndexerRefresh({
      description: 'referral claim',
      attempts: 15,
      delayMs: 1_000,
      check: async () => {
        const nextReferralState = await indexerClient.getReferralState(selectedAuthority)
        return nextReferralState.claimableLux < beforeClaimableLux
      },
      refresh: loadReferralAccount,
    })

    if (confirmation.confirmed && confirmation.refreshed) {
      setReferralConfirmation('Referral rewards claimed.')
      return
    }

    setReferralError(confirmation.error
      ? `Claim submitted, but reward data is still syncing: ${userFacingMessageFromText(confirmation.error)}`
      : 'Claim submitted, but reward data is still syncing.')
  }

  return {
    handleClaimReferralRewards,
  }
}
