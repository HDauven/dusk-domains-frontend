import { ArrowRight } from 'lucide-react'
import { AccountCard } from '../../components/ui/AccountCard'
import {
  walletActionLabel,
  walletActionTitle,
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
  const heading = selectedAddress ? 'Share it anywhere' : 'Get your link'
  const intro = selectedAddress
    ? 'It counts when someone registers a new name through it.'
    : walletRequiredIntro(walletSetupState, 'Connect a wallet to create your link.')

  return (
    <AccountCard
      heading={heading}
      intro={intro}
      title="Your link"
    >
      {selectedAddress ? (
        <div className="copy-row">
          <input aria-label="Referral link" readOnly value={referralLink} />
          <button className="commit-button" disabled={!referralLink} type="button" onClick={() => void onCopyReferralLink()}>
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
