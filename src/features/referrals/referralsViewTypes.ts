import type { DuskDomainTxState, IndexedReferralState } from '../../names/internal'
import type { WalletConnectionStatus } from '../wallet/walletStatus'
import type { ReferralState } from './referralState'

export type ReferralsViewProps = {
  onClearReferral: () => void
  referralError: string
  referralState: ReferralState
  referralConfirmation: string
  rewards: {
    onClaimReferralRewards: () => void
    referralAccountState: IndexedReferralState
    referralClaimRecipient: string
    referralClaimable: boolean
    referralRewardClaimReady: boolean
    referralRewardGuidance: string
    referralRewardSummaryValue: string
    referralRewardsSupported: boolean
    referralBusy: boolean
    referralTxState: DuskDomainTxState | null
  }
  link: {
    onCopyReferralLink: () => void
    referralCopied: boolean
    referralLink: string
  }
  wallet: {
    onOpenWalletConnection: () => void
    selectedAddress: string
    walletSetupState: WalletConnectionStatus
  }
}
