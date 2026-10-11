import { marketplaceFeeLabel } from './marketplacePresentation'

/**
 * How an official marketplace auction starts and ends. Marketplace v1: the first bid starts the
 * timer before the order's start deadline (this app sets 7 days); each bid beats the last by at
 * least 5%; a bid in the last 60 blocks moves the end to 60 blocks after it, at most 7 days past the
 * first end; anyone may settle for 8,640 blocks after the end. Past the start deadline, or the
 * settlement window, anyone may close it (`expire_order`): the top bid becomes the bidder's refund
 * and anyone may return the name (`retry_return`).
 * `startWindow` says when the first bid is due: an order's own deadline, or this app's 7 days.
 */
export function AuctionRules({ duration, feeBps, startWindow = 'before its start window closes' }: { duration: string; feeBps?: number | null; startWindow?: string }) {
  const fee = feeBps == null ? 'the market fee' : `the ${marketplaceFeeLabel(feeBps)} fee`
  return <details className="auction-rules">
    <summary>How auctions work</summary>
    <ul>
      <li>The timer starts at the first bid and runs {duration}. If nobody bids {startWindow}, the auction can be closed and the name returned to the seller.</li>
      <li>Each bid must be at least 5% higher than the last. A bid in the last 10 minutes moves the end to 10 minutes after it, by up to 7 days in total.</li>
      <li>When it ends, anyone can finalize it within a day. The highest bidder gets the name, with its records and primary name cleared, and the seller gets the bid minus {fee}.</li>
      <li>Outbid bidders withdraw their bids under Yours. If nobody finalizes it in time, anyone can close it. Then the highest bidder withdraws their bid the same way, and the name can be returned to the seller.</li>
    </ul>
  </details>
}
