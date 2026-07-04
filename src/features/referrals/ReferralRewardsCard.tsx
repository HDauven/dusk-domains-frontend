import { TransactionStatusNotice } from '../../components/status/TransactionStatusNotice'
import { txStatusCopy } from '../../components/status/txStatus'
import { AccountCard, AccountDetailItem, AccountDetailList } from '../../components/ui/AccountCard'
import { ClaimReview } from '../../components/ui/ClaimReview'
import { abbreviate } from '../../utils/format'
import { formatLuxNumberAsDusk } from '../treasury/feeConfig'
import type { ReferralsViewProps } from './referralsViewTypes'

export function ReferralRewardsCard({
  onClaimReferralRewards,
  referralAccountState,
  referralBusy,
  referralClaimRecipient,
  referralClaimable,
  referralRewardClaimReady,
  referralRewardGuidance,
  referralRewardSummaryValue,
  referralRewardsSupported,
  referralTxState,
}: Pick<ReferralsViewProps,
  | 'onClaimReferralRewards'
  | 'referralAccountState'
  | 'referralBusy'
  | 'referralClaimRecipient'
  | 'referralClaimable'
  | 'referralRewardClaimReady'
  | 'referralRewardGuidance'
  | 'referralRewardSummaryValue'
  | 'referralRewardsSupported'
  | 'referralTxState'
>) {
  return (
    <AccountCard
      className={referralRewardsSupported && referralClaimable ? 'rewards-account-card claimable' : 'rewards-account-card'}
      heading={referralRewardSummaryValue}
      intro={<span aria-live="polite">{referralRewardGuidance}</span>}
      title="Rewards"
    >
      <AccountDetailList>
        <AccountDetailItem label="Referrals" value={referralRewardsSupported ? referralAccountState.referralCount : '-'} />
        <AccountDetailItem
          label="Claimed"
          value={referralRewardsSupported ? formatLuxNumberAsDusk(referralAccountState.claimedLux) : '-'}
        />
      </AccountDetailList>
      {referralRewardsSupported && referralAccountState.recentActivity.length ? (
        <div className="referral-activity-list" aria-label="Recent referral activity">
          {referralAccountState.recentActivity.slice(0, 4).map((activity, index) => (
            <p key={`${activity.txId ?? 'referral'}:${activity.blockHeight ?? index}:${activity.kind}`}>
              <span>{activity.kind === 'claim' ? 'Paid out' : 'Earned'}</span>
              <strong>{formatLuxNumberAsDusk(activity.amountLux)}</strong>
            </p>
          ))}
        </div>
      ) : null}
      {referralRewardsSupported && referralClaimable ? (
        <>
          <ClaimReview
            ariaLabel={referralRewardClaimReady ? 'Referral claim review' : 'Referral rewards available'}
            rows={[
              {
                label: referralRewardClaimReady ? 'Review claim' : 'Available',
                value: formatLuxNumberAsDusk(referralAccountState.claimableLux),
              },
              {
                asCode: true,
                label: referralRewardClaimReady ? 'Recipient' : 'Wallet',
                value: abbreviate(referralClaimRecipient),
              },
            ]}
          />
          {referralRewardClaimReady ? (
            <button
              className="commit-button save-record"
              disabled={!referralClaimable || referralBusy}
              type="button"
              onClick={() => void onClaimReferralRewards()}
            >
              {referralBusy ? txStatusCopy(referralTxState?.status, referralTxState?.message) : 'Claim rewards'}
            </button>
          ) : null}
        </>
      ) : null}
      {referralTxState ? <TransactionStatusNotice className="management" state={referralTxState} /> : null}
    </AccountCard>
  )
}
