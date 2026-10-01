import { Button } from '../../components/ui/Button'
import { ShieldCheck, X } from 'lucide-react'
import { Dialog } from '../../components/ui/Dialog'
import { ClaimReview } from '../../components/ui/ClaimReview'
import { formatLuxNumberAsDusk } from '../treasury/feeConfig'
import { formatLuxAsDusk } from './auctionMath'
import { auctionDurationLabel, auctionTimeLabel } from './marketplacePresentation'
import type { MarketplaceViewProps } from './marketplaceTypes'

export function MarketplaceBidReview({ props }: { props: MarketplaceViewProps }) {
  const review = props.bidReview
  if (!review) return null
  const { auction } = review

  return (
    <Dialog open onClose={props.onCancelBidReview} labelledBy="marketplace-bid-review-heading">
      <section className="marketplace-bid-review">
        <div className="marketplace-review-heading">
          <div>
            <span>Review transaction</span>
            <h2 id="marketplace-bid-review-heading">Bid on {auction.name}</h2>
          </div>
          <Button aria-label="Close bid review" type="button" onClick={props.onCancelBidReview}><X aria-hidden="true" size={18} /></Button>
        </div>

        <div className="marketplace-review-amount">
          <span>You are bidding</span>
          <strong>{review.amountDusk} DUSK</strong>
        </div>

        <ClaimReview
          ariaLabel="Bid summary"
          rows={[
            { label: auction.highestBid ? 'Current highest bid' : 'Reserve price', value: formatLuxNumberAsDusk(auction.highestBid?.amountLux ?? auction.reservePriceLux) },
            { label: 'Minimum allowed', value: `${formatLuxAsDusk(review.minimumBidLux)} DUSK` },
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
          <Button type="button" onClick={props.onCancelBidReview}>Go back</Button>
          <Button variant="primary" className="compact" disabled={props.tradingPaused || !props.actionsAvailable} type="button" onClick={() => props.onPlaceBid(auction)}>Confirm in wallet</Button>
        </div>
      </section>
    </Dialog>
  )
}
