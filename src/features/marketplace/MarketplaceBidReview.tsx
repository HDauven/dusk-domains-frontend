import { ShieldCheck, X } from 'lucide-react'
import { useEffect } from 'react'
import { ClaimReview } from '../../components/ui/ClaimReview'
import { formatLuxNumberAsDusk } from '../treasury/feeConfig'
import { auctionDurationLabel, auctionTimeLabel } from './marketplacePresentation'
import type { MarketplaceViewProps } from './marketplaceTypes'

export function MarketplaceBidReview({ props }: { props: MarketplaceViewProps }) {
  const review = props.bidReview

  useEffect(() => {
    if (!review) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') props.onCancelBidReview()
    }
    globalThis.addEventListener('keydown', closeOnEscape)
    return () => globalThis.removeEventListener('keydown', closeOnEscape)
  }, [props, review])

  if (!review) return null
  const { auction } = review

  return (
    <div className="marketplace-review-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.currentTarget === event.target) props.onCancelBidReview()
    }}>
      <section aria-labelledby="marketplace-bid-review-heading" aria-modal="true" className="marketplace-bid-review" role="dialog">
        <div className="marketplace-review-heading">
          <div>
            <span>Review transaction</span>
            <h2 id="marketplace-bid-review-heading">Bid on {auction.name}</h2>
          </div>
          <button aria-label="Close bid review" type="button" onClick={props.onCancelBidReview}><X aria-hidden="true" size={18} /></button>
        </div>

        <div className="marketplace-review-amount">
          <span>You are bidding</span>
          <strong>{review.amountDusk} DUSK</strong>
        </div>

        <ClaimReview
          ariaLabel="Bid summary"
          rows={[
            { label: auction.highestBid ? 'Current highest bid' : 'Reserve price', value: formatLuxNumberAsDusk(auction.highestBid?.amountLux ?? auction.reservePriceLux) },
            { label: 'Minimum allowed', value: `${formatLux(review.minimumBidLux)} DUSK` },
            { label: auction.startBlockHeight === null ? 'Auction starts' : 'Time remaining', value: auction.startBlockHeight === null ? `After confirmation · ${auctionDurationLabel(auction.durationBlocks)}` : auctionTimeLabel(auction, props.currentBlockHeight) },
            { label: 'Network fee', value: 'Shown by your wallet before approval' },
          ]}
        />

        <div className="marketplace-review-custody">
          <ShieldCheck aria-hidden="true" size={19} />
          <div>
            <strong>Funds move into marketplace escrow</strong>
            <p>If you are outbid, this amount becomes withdrawable marketplace balance. Confirmed bids cannot be canceled.</p>
          </div>
        </div>

        <div className="marketplace-review-actions">
          <button className="commit-button" type="button" onClick={props.onCancelBidReview}>Go back</button>
          <button className="primary-button compact" disabled={!props.actionsAvailable} type="button" onClick={() => props.onPlaceBid(auction)}>Confirm in wallet</button>
        </div>
      </section>
    </div>
  )
}

function formatLux(value: bigint) {
  const whole = value / 1_000_000_000n
  const fraction = (value % 1_000_000_000n).toString().padStart(9, '0').replace(/0+$/u, '')
  return fraction ? `${whole}.${fraction}` : `${whole}`
}
