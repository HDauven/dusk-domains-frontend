import { AccountCard, AccountDetailItem, AccountDetailList } from '../../../components/ui/AccountCard'
import { formatLuxNumberAsDusk } from '../feeConfig'
import type { TreasuryClaimHistoryCardProps } from './types'

export function TreasuryClaimHistoryCard({
  treasuryState,
}: TreasuryClaimHistoryCardProps) {
  return (
    <AccountCard
      heading={treasuryState.claims.length ? `${treasuryState.claims.length}` : 'No claims'}
      title="Claim history"
    >
      {treasuryState.claims.length ? (
        <AccountDetailList>
          {treasuryState.claims.slice(0, 5).map((claim) => (
            <AccountDetailItem
              key={`${claim.txId ?? 'claim'}:${claim.blockHeight ?? 'pending'}:${claim.amountLux}`}
              label={claim.blockHeight === null ? 'Pending' : `Block ${claim.blockHeight}`}
              value={formatLuxNumberAsDusk(claim.amountLux)}
            />
          ))}
        </AccountDetailList>
      ) : (
        <p className="secure-note">No operator claims yet.</p>
      )}
    </AccountCard>
  )
}
