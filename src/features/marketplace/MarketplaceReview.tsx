import { useState } from 'react'
import { NamespaceTransferWarning } from './NamespaceSummary'
import { Input } from '../../components/ui/Input'
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
  const [acknowledgedReview, setAcknowledgedReview] = useState<MarketplaceReviewDetails | null>(null)
  if (!review) return null
  const requiresAcknowledgement = review.transfersNamespace && (review.namespace?.descendantCount ?? 0) > 0
  return <Dialog open onClose={onClose} labelledBy="marketplace-review-heading">
    <section className="marketplace-bid-review">
      <div className="marketplace-review-heading"><h2 id="marketplace-review-heading">{review.title}</h2></div>
      <MarketplaceReviewSummary ariaLabel="Transaction summary" rows={[
        ...review.rows,
        { label: 'Network fee', value: 'Shown by your wallet before approval' },
      ]} />
      {review.transfersNamespace ? <NamespaceTransferWarning namespace={review.namespace} /> : null}
      {requiresAcknowledgement ? <label className="field-note">
        <Input type="checkbox" checked={acknowledgedReview === review} onChange={event => setAcknowledgedReview(event.target.checked ? review : null)} />
        I understand the buyer can take back every subname.
      </label> : null}
      <p className="marketplace-custody-note">{review.note}</p>
      <div className="marketplace-review-actions">
        <Button onClick={onClose}>Go back</Button>
        <Button variant="primary" disabled={disabled || Boolean(requiresAcknowledgement && acknowledgedReview !== review)} onClick={onConfirm}>Confirm in wallet</Button>
      </div>
    </section>
  </Dialog>
}
