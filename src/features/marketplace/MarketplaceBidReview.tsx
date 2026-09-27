import { ShieldCheck, X } from 'lucide-react'
import { useLayoutEffect, useRef } from 'react'
import { ClaimReview } from '../../components/ui/ClaimReview'
import { formatLuxNumberAsDusk } from '../treasury/feeConfig'
import { auctionDurationLabel, auctionTimeLabel } from './marketplacePresentation'
import type { MarketplaceViewProps } from './marketplaceTypes'

export function MarketplaceBidReview({ props }: { props: MarketplaceViewProps }) {
  const review = props.bidReview
  const dialogRef = useRef<HTMLDialogElement>(null)
  const open = Boolean(review)

  useLayoutEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    const previousFocus = document.activeElement
    dialog?.showModal()
    return () => {
      dialog?.close()
      // React can remove the dialog before the browser restores its opener.
      if (previousFocus instanceof HTMLElement) previousFocus.focus()
    }
  }, [open])

  if (!review) return null
  const { auction } = review

  return (
    <dialog ref={dialogRef} aria-labelledby="marketplace-bid-review-heading" className="marketplace-review-backdrop" onCancel={props.onCancelBidReview} onMouseDown={(event) => {
      if (event.currentTarget === event.target) props.onCancelBidReview()
    }}>
      <section className="marketplace-bid-review">
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
    </dialog>
  )
}

function formatLux(value: bigint) {
  const whole = value / 1_000_000_000n
  const fraction = (value % 1_000_000_000n).toString().padStart(9, '0').replace(/0+$/u, '')
  return fraction ? `${whole}.${fraction}` : `${whole}`
}
