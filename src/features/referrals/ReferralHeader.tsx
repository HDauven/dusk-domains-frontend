import { AccountViewHeader } from '../../components/ui/AccountViewHeader'
import { MetricSummary } from '../../components/ui/MetricSummary'
import { RefreshButton } from '../../components/ui/RefreshButton'
import { walletRequiredHeading, walletRequiredIntro } from '../wallet/walletStatus'
import type { ReferralsViewProps } from './referralsViewTypes'

export function ReferralHeader({
  onRefresh,
  referralAttributionLabel,
  referralLoading,
  referralRewardSummaryValue,
  selectedAddress,
  showReferralSummary,
  walletSetupState,
}: Pick<ReferralsViewProps,
  | 'onRefresh'
  | 'referralAttributionLabel'
  | 'referralLoading'
  | 'referralRewardSummaryValue'
  | 'selectedAddress'
  | 'showReferralSummary'
  | 'walletSetupState'
>) {
  const walletPrompt = selectedAddress
    ? 'Share your link and claim rewards.'
    : walletRequiredIntro(walletSetupState, 'Create your referral link.')

  const linkStatus = selectedAddress
    ? 'Ready'
    : walletRequiredHeading(walletSetupState)

  return (
    <AccountViewHeader
      description={walletPrompt}
      heading="Referrals"
      headingId="referrals-heading"
      actions={showReferralSummary ? (
        <>
          <MetricSummary
            ariaLabel="Referral summary"
            items={[
              { label: 'link', value: linkStatus },
              { label: 'referral', value: referralAttributionLabel },
              { label: 'rewards', value: referralRewardSummaryValue },
            ]}
          />
          <RefreshButton loading={referralLoading} onRefresh={onRefresh} />
        </>
      ) : null}
    />
  )
}
