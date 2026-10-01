import { Button } from '../../components/ui/Button'
import { ShieldCheck, X } from 'lucide-react'
import { Dialog } from '../../components/ui/Dialog'
import { MarketplaceReviewSummary } from './MarketplaceReviewSummary'
import { formatLuxAsDusk } from './auctionMath'
import { marketplaceAmountRow } from './marketplaceAmounts'
import { auctionDurationLabel, auctionTimeLabel } from './marketplacePresentation'
import type { MarketplaceBidReviewProps } from './marketplaceTypes'

export function MarketplaceBidReview({ props }: { props: MarketplaceBidReviewProps }) {
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
          <strong><span className="marketplace-amount">{formatLuxAsDusk(review.amountLux)} DUSK</span></strong>
        </div>

        <MarketplaceReviewSummary
          ariaLabel="Bid summary"
          rows={[
            marketplaceAmountRow(auction.highestBid ? 'Current highest bid' : 'Reserve price', BigInt(auction.highestBid?.amountLux ?? auction.reservePriceLux)),
            marketplaceAmountRow('Minimum allowed', review.minimumBidLux),
            { label: auction.startBlockHeight === null ? 'Auction starts' : 'Time remaining', value: auction.startBlockHeight === null ? `After confirmation · ${auctionDurationLabel(auction.durationBlocks)}` : auctionTimeLabel(auction, props.currentBlockHeight) },
            { label: 'If you win, name moves to', value: props.selectedAddress, address: true },
            { label: 'Network fee', value: 'Shown by your wallet before approval' },
          ]}
        />

        <div className="marketplace-review-custody">
          <ShieldCheck aria-hidden="true" size={19} />
          <div>
            <strong>Funds move into marketplace escrow</strong>
            <p>Your full bid moves from your wallet into escrow. If you win, finalization transfers the name to you and pays the seller minus the marketplace fee. If you are outbid, withdraw your refund under Yours. Raising your own bid also makes your previous bid refundable. Confirmed bids cannot be canceled.</p>
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
