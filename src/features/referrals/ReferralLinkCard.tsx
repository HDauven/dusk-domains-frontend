import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { ArrowRight } from 'lucide-react'
import { AccountCard } from '../../components/ui/AccountCard'
import {
  walletActionLabel,
  walletActionTitle,
  walletRequiredIntro,
} from '../wallet/walletStatus'
import type { ReferralsViewProps } from './referralsViewTypes'

export function ReferralLinkCard({ link, wallet }: {
  link: Pick<ReferralsViewProps['link'], 'onCopyReferralLink' | 'referralCopied' | 'referralLink'>
  wallet: Pick<ReferralsViewProps['wallet'], 'onOpenWalletConnection' | 'selectedAddress' | 'walletSetupState'>
}) {
  const {
    onCopyReferralLink,
    referralCopied,
    referralLink,
  } = link
  const {
    onOpenWalletConnection,
    selectedAddress,
    walletSetupState,
  } = wallet
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
          <Input aria-label="Referral link" readOnly value={referralLink} />
          <Button disabled={!referralLink} type="button" onClick={() => void onCopyReferralLink()}>
            {referralCopied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      ) : (
        <Button variant="primary"
          className="compact"
          disabled={walletSetupState === 'detecting'}
          title={walletActionTitle(walletSetupState)}
          type="button"
          onClick={() => void onOpenWalletConnection()}
        >
          {walletActionLabel(walletSetupState)}
          <ArrowRight size={18} />
        </Button>
      )}
    </AccountCard>
  )
}
