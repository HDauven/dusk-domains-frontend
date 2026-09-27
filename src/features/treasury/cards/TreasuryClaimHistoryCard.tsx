import { AccountCard, AccountDetailItem, AccountDetailList } from '../../../components/ui/AccountCard'
import { pluralize } from '../../../utils/format'
import { formatLuxNumberAsDusk } from '../feeConfig'
import type { TreasuryClaimHistoryCardProps } from './types'

export function TreasuryClaimHistoryCard({
  treasuryState,
}: TreasuryClaimHistoryCardProps) {
  return (
    <AccountCard
      heading={treasuryState.claims.length ? `${treasuryState.claims.length} ${pluralize(treasuryState.claims.length, 'payout')}` : 'No payouts yet'}
      title="Operator payouts"
    >
      {treasuryState.claims.length ? (
        <AccountDetailList>
          {treasuryState.claims.slice(0, 5).map((claim) => (
            <AccountDetailItem
              key={`${claim.txId ?? 'claim'}:${claim.blockHeight ?? 'pending'}:${claim.amountLux}`}
              label={claim.blockHeight === null ? 'Pending' : `Block ${claim.blockHeight.toLocaleString('en')}`}
              value={formatLuxNumberAsDusk(claim.amountLux)}
            />
          ))}
        </AccountDetailList>
      ) : (
        <p className="secure-note">Payouts to the operator show up here.</p>
      )}
    </AccountCard>
  )
}
