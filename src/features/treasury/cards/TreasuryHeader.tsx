import { AccountViewHeader } from '../../../components/ui/AccountViewHeader'
import { MetricSummary } from '../../../components/ui/MetricSummary'
import { RefreshButton } from '../../../components/ui/RefreshButton'
import { formatLuxNumberAsDusk } from '../feeConfig'
import { operatorClaimedLux } from '../treasuryAccounting'
import type { TreasuryHeaderProps } from './types'

export function TreasuryHeader({
  feeConfigLoading,
  onRefresh,
  treasuryLoading,
  treasuryState,
}: TreasuryHeaderProps) {
  const claimedLux = operatorClaimedLux(treasuryState)

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
            { label: 'operator claimed', value: formatLuxNumberAsDusk(claimedLux) },
          ]}
        />
        <RefreshButton
          disabled={treasuryLoading || feeConfigLoading}
          loading={treasuryLoading || feeConfigLoading}
          onRefresh={onRefresh}
        />
        </>
      )}
    />
  )
}
