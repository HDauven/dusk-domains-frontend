import { ClaimReview } from '../../components/ui/ClaimReview'
import { CopyValue } from '../../components/ui/CopyValue'
import { abbreviate } from '../../utils/format'
import type { MarketplaceReviewDetails } from './marketplaceTypes'

export function MarketplaceReviewSummary({ ariaLabel, rows }: { ariaLabel: string; rows: MarketplaceReviewDetails['rows'] }) {
  return <ClaimReview ariaLabel={ariaLabel} rows={rows.map((row) => ({
    label: row.label,
    value: <>{row.address ? <span className="marketplace-review-address">
      <code title={row.value}>{abbreviate(row.value)}</code>
      <CopyValue label={row.label} value={row.value} />
    </span> : row.exactValue ? <span className="marketplace-amount" title={row.exactValue}>{row.value}</span> : row.value}
      {row.detail ? <small className="marketplace-payment-split">{row.detail}</small> : null}
    </>,
  }))} />
}
