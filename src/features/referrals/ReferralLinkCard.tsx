import { ArrowRight } from 'lucide-react'
import { AccountCard } from '../../components/ui/AccountCard'
import {
  walletActionLabel,
  walletActionTitle,
  walletRequiredHeading,
  walletRequiredIntro,
} from '../wallet/walletStatus'
import type { ReferralsViewProps } from './referralsViewTypes'

export function ReferralLinkCard({
  onCopyReferralLink,
  onOpenWalletConnection,
  referralCopied,
  referralLink,
  selectedAddress,
  walletSetupState,
}: Pick<ReferralsViewProps,
  | 'onCopyReferralLink'
  | 'onOpenWalletConnection'
  | 'referralCopied'
  | 'referralLink'
  | 'selectedAddress'
  | 'walletSetupState'
>) {
  const heading = selectedAddress ? 'Ready' : walletRequiredHeading(walletSetupState)
  const intro = selectedAddress
    ? 'Share this link for first registrations.'
    : walletRequiredIntro(walletSetupState, 'Create your referral link.')

  return (
    <AccountCard
      className="primary-account-card"
      heading={heading}
      intro={intro}
      title="Your link"
    >
      {selectedAddress ? (
        <div className="copy-row">
          <input readOnly value={referralLink} />
          <button className="commit-button save-record" disabled={!referralLink} type="button" onClick={() => void onCopyReferralLink()}>
            {referralCopied ? 'Copied' : 'Copy'}
          </button>
        </div>
      ) : (
        <button
          className="primary-button compact"
          disabled={walletSetupState === 'detecting'}
          title={walletActionTitle(walletSetupState)}
          type="button"
          onClick={() => void onOpenWalletConnection()}
        >
          {walletActionLabel(walletSetupState)}
          <ArrowRight size={18} />
        </button>
      )}
    </AccountCard>
  )
}
