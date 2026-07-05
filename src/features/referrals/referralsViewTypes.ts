import type { DuskDomainTxState, IndexedReferralState } from '../../names/internal'
import type { WalletConnectionStatus } from '../wallet/walletStatus'
import type { ReferralState } from './referralState'

export type ReferralsViewProps = {
  activeReferral: ReferralState | null
  appliedReferral: ReferralState | null
  onClaimReferralRewards: () => void
  onClearReferral: () => void
  onCopyReferralLink: () => void
  onOpenWalletConnection: () => void
  onRefresh: () => void
  onReferralInputChange: (value: string) => void
  referralAccountState: IndexedReferralState
  referralAttributionLabel: string
  referralClaimRecipient: string
  referralClaimable: boolean
  referralCopied: boolean
  referralError: string
  referralLink: string
  referralLoading: boolean
  referralRewardClaimReady: boolean
  referralRewardGuidance: string
  referralRewardSummaryValue: string
  referralRewardsSupported: boolean
  referralState: ReferralState
  referralBusy: boolean
  referralConfirmation: string
  referralTxState: DuskDomainTxState | null
  selectedAddress: string
  showReferralSummary: boolean
  walletSetupState: WalletConnectionStatus
}
