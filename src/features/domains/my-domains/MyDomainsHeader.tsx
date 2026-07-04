import { AccountViewHeader } from '../../../components/ui/AccountViewHeader'
import { MetricSummary } from '../../../components/ui/MetricSummary'
import { RefreshButton } from '../../../components/ui/RefreshButton'
import type { MyDomainsHeaderProps } from './types'

export function MyDomainsHeader({
  description,
  heading,
  loading,
  myNames,
  onRefresh,
  pendingReservations,
  verifiedPrimaryCount,
}: MyDomainsHeaderProps) {
  const pendingReservationCount = pendingReservations.length
  const showSummary = myNames.length > 0 || pendingReservationCount > 0

  return (
    <AccountViewHeader
      description={description}
      heading={heading}
      headingId="my-names-heading"
      actions={(
        <>
        {showSummary ? (
          <MetricSummary
            ariaLabel="My Domains summary"
            items={[
              ...(pendingReservationCount > 0
                ? [{
                    ariaLabel: `${pendingReservationCount} ${pluralize(pendingReservationCount, 'reserved domain', 'reserved domains')}`,
                    label: 'reserved',
                    value: pendingReservationCount,
                  }]
                : []),
              {
                ariaLabel: `${myNames.length} ${pluralize(myNames.length, 'domain')}`,
                label: 'active',
                value: myNames.length,
              },
              {
                ariaLabel: `${verifiedPrimaryCount} ${pluralize(verifiedPrimaryCount, 'verified domain', 'verified domains')}`,
                label: 'primary set',
                value: verifiedPrimaryCount,
              },
            ]}
          />
        ) : null}
        <RefreshButton loading={loading} onRefresh={onRefresh} />
        </>
      )}
    />
  )
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural
}
