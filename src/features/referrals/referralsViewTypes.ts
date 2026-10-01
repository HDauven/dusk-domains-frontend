import type { DuskDomainTxState, IndexedReferralState } from '../../names/internal'
import type { WalletConnectionStatus } from '../wallet/walletStatus'
import type { ReferralState } from './referralState'

export type ReferralsViewProps = {
  onClaimReferralRewards: () => void
  onClearReferral: () => void
  onCopyReferralLink: () => void
  onOpenWalletConnection: () => void
  referralAccountState: IndexedReferralState
  referralClaimRecipient: string
  referralClaimable: boolean
  referralCopied: boolean
  referralError: string
  referralLink: string
  referralRewardClaimReady: boolean
  referralRewardGuidance: string
  referralRewardSummaryValue: string
  referralRewardsSupported: boolean
  referralState: ReferralState
  referralBusy: boolean
  referralConfirmation: string
  referralTxState: DuskDomainTxState | null
  selectedAddress: string
  walletSetupState: WalletConnectionStatus
}
