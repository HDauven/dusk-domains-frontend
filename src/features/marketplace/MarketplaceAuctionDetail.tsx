import { MarketplaceFreshness } from './MarketplaceFreshness'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Panel } from '../../components/ui/Panel'
import { Input } from '../../components/ui/Input'
import { ArrowLeft, Clock3, Gavel, ShieldCheck, Star, UserRound } from 'lucide-react'
import { type ActivityEntry, type IndexedMarketplaceAuction } from '../../names/internal'
import { abbreviate } from '../../utils/format'
import { activityActor } from '../activity/activityCopy'
import { activityWhen } from '../activity/activityTime'
import { formatActivityTime } from '../domains/domainFormat'
import { MarketplaceAmount } from './MarketplaceAmount'
import { formatLuxAsDusk, minimumBidDusk, minimumBidLux } from './auctionMath'
import { AuctionCountdown } from './AuctionCountdown'
import { ListingName } from './ListingName'
import {
  auctionDurationLabel,
  auctionStartWindowLabel,
  auctionStatus,
  auctionStatusLabel,
  auctionStatusTone,
  marketplaceFeeLabel,
  sameAuthority,
} from './marketplacePresentation'
import type { MarketplaceAuctionDetailProps } from './marketplaceTypes'

export function MarketplaceAuctionDetail({ auction, props }: { auction: IndexedMarketplaceAuction; props: MarketplaceAuctionDetailProps }) {
  const status = auctionStatus(auction, props.currentBlockHeight)
  const ownAuction = sameAuthority(auction.sellerAuthority, props.selectedAuthority)
  const leading = sameAuthority(auction.highestBid?.bidderAuthority, props.selectedAuthority)
  const watched = props.watchedNodes.includes(auction.node)
  const minimum = minimumBidDusk(auction)
  const marketplaceActivity = props.auctionActivity.filter((entry) => entry.eventType === 'domain_bid_placed' && (entry.blockHeight === null || entry.blockHeight >= auction.createdAtBlockHeight))

  return (
    <div className="marketplace-auction-detail">
      <div className="marketplace-navigation"><Button variant="quiet" className="marketplace-back-button" type="button" onClick={props.onCloseAuction}>
        <ArrowLeft aria-hidden="true" size={15} /> All listings
      </Button><MarketplaceFreshness updatedAt={props.updatedAt} /></div>

      <div className="marketplace-auction-hero">
        <div>
          <ListingName id="marketplace-heading" heading="h1" name={auction.name} size={64} />
          <p>{auction.startBlockHeight === null
            ? `Starts when someone bids, then runs ${auctionDurationLabel(auction.durationBlocks)}.`
            : 'The highest bid wins when the auction ends.'}</p>
        </div>
        <div className="marketplace-auction-hero-actions">
          <Badge tone={auctionStatusTone(status)}>{auctionStatusLabel(status)}</Badge>
          <Button variant="quiet"
            aria-label={`${watched ? 'Stop watching' : 'Watch'} ${auction.name}`}
            aria-pressed={watched}
            className={`marketplace-watch-button labeled${watched ? ' active' : ''}`}
            type="button"
            onClick={() => props.onToggleWatch(auction.node)}
          >
            <Star aria-hidden="true" fill={watched ? 'currentColor' : 'none'} size={16} /> {watched ? 'Watching' : 'Watch'}
          </Button>
        </div>
      </div>

      <div className="marketplace-auction-layout">
        <div className="marketplace-auction-main">
          <Panel className="marketplace-auction-facts" aria-labelledby="auction-details-heading">
            <div className="marketplace-section-heading">
              <h3 id="auction-details-heading" className="eyebrow">Details</h3>
            </div>
            <dl>
              <div><dt><UserRound aria-hidden="true" size={14} /> Seller</dt><dd><code>{ownAuction ? 'You' : abbreviate(auction.sellerAuthority)}</code></dd></div>
              <div><dt><Clock3 aria-hidden="true" size={14} /> Duration</dt><dd>{auctionDurationLabel(auction.durationBlocks)}</dd></div>
              <div><dt>Bids</dt><dd>{auction.bidCount}</dd></div>
              <div><dt>Marketplace fee</dt><dd>{marketplaceFeeLabel(auction.feeBps)} from seller proceeds</dd></div>
              <div><dt><ShieldCheck aria-hidden="true" size={14} /> Custody</dt><dd>{auction.escrowed ? 'Name held in escrow' : 'Escrow verification failed'}</dd></div>
              {auction.startBlockHeight === null ? <div><dt>Start window</dt><dd>{auctionStartWindowLabel(auction, props.currentBlockHeight)}</dd></div> : null}
            </dl>
          </Panel>

          <Panel className="marketplace-auction-activity" aria-labelledby="auction-activity-heading">
            <div className="marketplace-section-heading">
              <h3 id="auction-activity-heading" className="eyebrow">Bids · {auction.bidCount}</h3>
            </div>
            {props.auctionActivityLoading ? (
              <p className="marketplace-activity-empty">Loading auction activity…</p>
            ) : marketplaceActivity.length ? (
              <ol>
                {marketplaceActivity.map((entry) => (
                  <AuctionActivityRow currentBlockHeight={props.currentBlockHeight} entry={entry} key={entry.id} viewerAuthority={props.selectedAuthority} />
                ))}
              </ol>
            ) : (
              <p className="marketplace-activity-empty">No bids yet. The first bid starts the auction.</p>
            )}
            {props.auctionActivityHasMore ? <Button variant="quiet" disabled={props.auctionActivityLoading} type="button" onClick={props.onLoadMoreAuctionActivity}>Load more auction activity</Button> : null}
          </Panel>
        </div>

        <Panel as="aside" className="marketplace-bid-panel" aria-label={`Bid on ${auction.name}`}>
          {leading ? <p className="marketplace-bidder-banner leading">{status === 'ended' ? 'You won — finalizing' : 'You’re the highest bidder'}</p> : null}
          {ownAuction ? <p className="marketplace-bidder-banner selling">You’re selling this name</p> : null}
          <div className="marketplace-bid-price">
            <span>{auction.highestBid ? 'Current bid' : 'Minimum bid'}</span>
            <strong><MarketplaceAmount lux={auction.highestBid?.amountLux ?? auction.reservePriceLux} roundUp={!auction.highestBid} /></strong>
            <small>{auction.bidCount} confirmed {auction.bidCount === 1 ? 'bid' : 'bids'}</small>
          </div>
          <div className="marketplace-bid-timer">
            <span>{auction.endBlockHeight === null ? 'Starts with first bid' : 'Time remaining'}</span>
            <strong>{auction.endBlockHeight === null ? auctionDurationLabel(auction.durationBlocks) : <AuctionCountdown endBlock={auction.endBlockHeight} currentBlock={props.currentBlockHeight} />}</strong>
            <small>{auction.endBlockHeight === null ? `Start window: ${auctionStartWindowLabel(auction, props.currentBlockHeight)}` : 'Estimated from chain time.'} Bids in the last 10 minutes extend it to 10 minutes remaining.</small>
          </div>

          <AuctionAction auction={auction} minimum={minimum} ownAuction={ownAuction} props={props} status={status} />
        </Panel>
      </div>
    </div>
  )
}

function AuctionAction({
  auction,
  minimum,
  ownAuction,
  props,
  status,
}: {
  auction: IndexedMarketplaceAuction
  minimum: string
  ownAuction: boolean
  props: MarketplaceAuctionDetailProps
  status: ReturnType<typeof auctionStatus>
}) {
  if (status === 'ended') {
    return (
      <div className="marketplace-auction-action-stack">
        <p>The auction is over. Finalization transfers the name and pays the seller.</p>
        <Button variant="primary" className="compact" disabled={!props.actionsAvailable} type="button" onClick={() => props.onSettleAuction(auction)}>Finalize auction</Button>
      </div>
    )
  }
  if (status === 'expired') {
    return (
      <div className="marketplace-auction-action-stack">
        <p>No bid started this auction before its deadline.</p>
        <Button disabled={!props.actionsAvailable} type="button" onClick={() => props.onExpireAuction(auction)}>Close auction</Button>
      </div>
    )
  }
  if (ownAuction) {
    return auction.highestBid === null ? (
      <div className="marketplace-auction-action-stack">
        <p>You can cancel before the first bid. After bidding starts, the auction is binding.</p>
        <Button disabled={!props.actionsAvailable} type="button" onClick={() => props.onCancelAuction(auction)}>Cancel auction</Button>
      </div>
    ) : (
      <div className="marketplace-auction-action-stack"><p>Your name remains in escrow until the auction is finalized.</p></div>
    )
  }
  if (!props.selectedAddress) {
    return <Button variant="primary" className="compact" type="button" onClick={props.onOpenWalletConnection}>Connect wallet to bid</Button>
  }
  const form = (
    <div className="marketplace-auction-action-stack">
      <label className="marketplace-bid-field">
        <span>Your bid</span>
        <div className="marketplace-input-suffix">
          <Input
            aria-describedby={`bid-help-${auction.node}`}
            aria-label={`Bid on ${auction.name}`}
            disabled={props.tradingPaused || !props.actionsAvailable || !auction.escrowed}
            inputMode="decimal"
            type="text"
            value={props.bidDrafts[auction.node] ?? minimum}
            onChange={(event) => props.onBidDraftChange(auction.node, event.target.value)}
          />
          <span>DUSK</span>
        </div>
      </label>
      <div className="marketplace-minimum-row" id={`bid-help-${auction.node}`}>
        {auction.highestBid ? <span title={`${formatLuxAsDusk(minimumBidLux(auction))} DUSK`}>Minimum {minimum} DUSK</span> : null}
        <Button type="button" onClick={() => props.onBidDraftChange(auction.node, minimum)}>Use minimum</Button>
      </div>
      <Button variant="primary" className="compact" disabled={props.tradingPaused || !props.actionsAvailable || !auction.escrowed} type="button" onClick={() => props.onReviewBid(auction)}>Review bid</Button>
      <p className="marketplace-custody-note">Your full bid is locked in the marketplace contract. If you’re outbid, it becomes withdrawable marketplace balance.</p>
    </div>
  )
  return sameAuthority(auction.highestBid?.bidderAuthority, props.selectedAuthority)
    ? <details className="marketplace-raise-bid"><summary>Raise bid</summary>{form}</details>
    : form

}

function AuctionActivityRow({ currentBlockHeight, entry, viewerAuthority }: { currentBlockHeight: number | null; entry: ActivityEntry; viewerAuthority: string }) {
  const amount = marketplaceActivityAmount(entry)
  return (
    <li>
      <span className="marketplace-activity-icon"><Gavel aria-hidden="true" size={14} /></span>
      <div>
        <strong>Bid placed</strong>
        <span>{activityActor(entry.actor, viewerAuthority) || 'Marketplace'}</span>
      </div>
      <div className="marketplace-activity-value">
        {amount ? <strong>{amount}</strong> : null}
        <time title={entry.blockHeight === null ? undefined : `Block ${entry.blockHeight.toLocaleString()}`}>
          {activityWhen(entry.blockHeight, currentBlockHeight, entry.timestamp, formatActivityTime)}
        </time>
      </div>
    </li>
  )
}

function marketplaceActivityAmount(entry: ActivityEntry) {
  if (!entry.target || !/^\d+$/u.test(entry.target)) return ''
  const value = Number(entry.target)
  if (!Number.isSafeInteger(value) || value <= 0) return ''
  return <MarketplaceAmount lux={value} />
}
