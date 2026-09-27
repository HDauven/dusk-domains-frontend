import { AccountViewHeader } from '../../components/ui/AccountViewHeader'
import { MetricSummary } from '../../components/ui/MetricSummary'
import { RefreshButton } from '../../components/ui/RefreshButton'
import { walletRequiredHeading } from '../wallet/walletStatus'
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
  const linkStatus = selectedAddress
    ? 'Ready'
    : walletRequiredHeading(walletSetupState)

  return (
    <AccountViewHeader
      description="Share your link. When someone registers a name through it, you earn part of the fee, and they pay nothing extra."
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
