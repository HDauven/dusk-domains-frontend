import { AccountCard, AccountDetailItem, AccountDetailList } from '../../../components/ui/AccountCard'
import { formatLuxNumberAsDusk } from '../feeConfig'
import { recentOperatorClaimsLux, referralAllocatedLux } from '../treasuryAccounting'
import type { TreasuryAccountingCardProps } from './types'

export function TreasuryAccountingCard({
  treasuryState,
}: TreasuryAccountingCardProps) {
  const referralTotalLux = referralAllocatedLux(treasuryState)
  const recentClaimsLux = recentOperatorClaimsLux(treasuryState)

  return (
    <AccountCard heading="Fees" title="Accounting">
      <AccountDetailList>
        <AccountDetailItem label="Registrations" value={formatLuxNumberAsDusk(treasuryState.registrationReceivedLux)} />
        <AccountDetailItem label="Premiums (included in registrations)" value={formatLuxNumberAsDusk(treasuryState.premiumReceivedLux ?? 0)} />
        <AccountDetailItem label="Renewals" value={formatLuxNumberAsDusk(treasuryState.renewalReceivedLux)} />
        <AccountDetailItem label="Referral claimable" value={formatLuxNumberAsDusk(treasuryState.referralClaimableLux)} />
        <AccountDetailItem label="Referral paid" value={formatLuxNumberAsDusk(treasuryState.referralClaimedLux)} />
        <AccountDetailItem label="Referral total" value={formatLuxNumberAsDusk(referralTotalLux)} />
        <AccountDetailItem label="Recent operator claims" value={formatLuxNumberAsDusk(recentClaimsLux)} />
        <AccountDetailItem label="Other" value={formatLuxNumberAsDusk(treasuryState.otherReceivedLux)} />
        <AccountDetailItem
          label="Last event"
          value={treasuryState.lastEventType ? treasuryState.lastEventType.replaceAll('_', ' ') : '-'}
        />
      </AccountDetailList>
    </AccountCard>
  )
}
