import { AccountViewHeader } from '../../../components/ui/AccountViewHeader'
import { MetricSummary } from '../../../components/ui/MetricSummary'
import { formatLuxNumberAsDusk } from '../feeConfig'
import { recentOperatorClaimsLux } from '../treasuryAccounting'
import type { TreasuryHeaderProps } from './types'

export function TreasuryHeader({
  treasuryState,
}: TreasuryHeaderProps) {
  const claimedLux = recentOperatorClaimsLux(treasuryState)

  return (
    <AccountViewHeader
      description={treasuryState.initialized ? 'Protocol fees and payouts.' : 'Treasury unavailable.'}
      heading="Treasury"
      headingId="treasury-heading"
      actions={(
        <>
        <MetricSummary
          ariaLabel="Treasury summary"
          items={[
            { label: 'available', value: formatLuxNumberAsDusk(treasuryState.availableLux) },
            { label: 'received', value: formatLuxNumberAsDusk(treasuryState.totalReceivedLux) },
            { label: 'recent operator claims', value: formatLuxNumberAsDusk(claimedLux) },
          ]}
        />
        </>
      )}
    />
  )
}
