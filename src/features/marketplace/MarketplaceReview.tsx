import { Button } from '../../components/ui/Button'
import { MarketplaceReviewSummary } from './MarketplaceReviewSummary'
import { Dialog } from '../../components/ui/Dialog'
import type { MarketplaceReviewDetails } from './marketplaceTypes'

export function MarketplaceReview({ review, disabled, onClose, onConfirm }: {
  review: MarketplaceReviewDetails | null
  disabled: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  if (!review) return null
  return <Dialog open onClose={onClose} labelledBy="marketplace-review-heading">
    <section className="marketplace-bid-review">
      <div className="marketplace-review-heading"><h2 id="marketplace-review-heading">{review.title}</h2></div>
      <MarketplaceReviewSummary ariaLabel="Transaction summary" rows={[
        ...review.rows,
        { label: 'Network fee', value: 'Shown by your wallet before approval' },
      ]} />
      <p className="marketplace-custody-note">{review.note}</p>
      <div className="marketplace-review-actions">
        <Button onClick={onClose}>Go back</Button>
        <Button variant="primary" disabled={disabled} onClick={onConfirm}>Confirm in wallet</Button>
      </div>
    </section>
  </Dialog>
}
