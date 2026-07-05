import {
  isDuskDomainTxBusy,
  type DuskDomainTxState,
  type IndexedReferralState,
} from '../../names/internal'
import {
  formatLuxNumberAsDusk,
  referralRewardEmptyCopy,
  referralRewardStatusGuidance,
  referralRewardStatusLabel,
} from '../treasury/feeConfig'
import type { ReferralState } from './referralState'

type UseReferralViewModelArgs = {
  referralAccountState: IndexedReferralState
  referralAttributionEnabled: boolean
  referralError: string
  referralLoading: boolean
  referralRewardClaimsAvailable: boolean
  referralState: ReferralState
  referralTxState: DuskDomainTxState | null
  selectedAddress: string
  selectedAuthority: string
  selectedReferralKey: string
  selectedIsMoonlightAccount: boolean
}

export function useReferralViewModel({
  referralAccountState,
  referralAttributionEnabled,
  referralError,
  referralLoading,
  referralRewardClaimsAvailable,
  referralState,
  referralTxState,
  selectedAddress,
  selectedAuthority,
  selectedReferralKey,
  selectedIsMoonlightAccount,
}: UseReferralViewModelArgs) {
  const activeReferral = referralState.valid ? referralState : null
  const appliedReferral = activeReferral && referralAttributionEnabled ? activeReferral : null
  const referralRewardsSupported = referralAccountState.supported
  const referralClaimable = referralAccountState.claimableLux > 0
  const referralBusy = isDuskDomainTxBusy(referralTxState)
  const referralRewardClaimReady = Boolean(referralRewardClaimsAvailable && selectedIsMoonlightAccount)
  const referralClaimRecipient = selectedAddress || selectedAuthority
  const referralAttributionLabel = appliedReferral ? 'Applied' : activeReferral ? 'Saved' : 'None'
  const referralRewardLabel = referralRewardStatusLabel({
    loading: referralLoading,
    selectedAddress,
    error: referralError,
    supported: referralRewardsSupported,
    claimable: referralClaimable,
  })
  const referralRewardEmptyMessage = referralRewardEmptyCopy(referralAccountState)
  const referralRewardGuidance = referralRewardsSupported && referralClaimable && referralError
    ? 'Claim failed. Rewards remain available.'
    : referralRewardsSupported && referralClaimable && !referralRewardClaimsAvailable && !referralLoading
      ? 'Rewards are visible. Claims are disabled here.'
      : referralRewardsSupported && referralClaimable && referralRewardClaimsAvailable && !selectedIsMoonlightAccount && !referralLoading
        ? 'Connect a Dusk public account to claim.'
        : referralRewardsSupported && !referralClaimable && !referralLoading && !referralError
          ? referralRewardEmptyMessage
          : referralRewardStatusGuidance({
              loading: referralLoading,
              selectedAddress,
              error: referralError,
              supported: referralRewardsSupported,
              claimable: referralClaimable,
            })
  const referralRewardSummaryValue = referralRewardsSupported && !referralLoading
    ? formatLuxNumberAsDusk(referralAccountState.claimableLux)
    : referralRewardLabel
  const showReferralSummary = Boolean(selectedAddress || activeReferral || referralRewardsSupported)

  return {
    activeReferral,
    appliedReferral,
    referralAttributionLabel,
    referralBusy,
    referralClaimRecipient,
    referralClaimable,
    referralRewardClaimReady,
    referralRewardGuidance,
    referralRewardSummaryValue,
    referralRewardsSupported,
    selectedReferralKey,
    showReferralSummary,
  }
}
