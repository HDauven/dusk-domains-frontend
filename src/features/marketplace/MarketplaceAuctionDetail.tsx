import { ArrowLeft, Clock3, Gavel, ShieldCheck, Star, UserRound } from 'lucide-react'
import { activityLabel, type ActivityEntry, type IndexedMarketplaceAuction } from '../../names/internal'
import { abbreviate } from '../../utils/format'
import { activityActor } from '../activity/activityCopy'
import { activityWhen } from '../activity/activityTime'
import { formatActivityTime } from '../domains/domainFormat'
import { formatLuxNumberAsDusk } from '../treasury/feeConfig'
import { minimumBidDusk } from './auctionMath'
import { ListingName } from './ListingName'
import {
  auctionDurationLabel,
  auctionStartWindowLabel,
  auctionStatus,
  auctionStatusLabel,
  auctionStatusTone,
  auctionTimeLabel,
  marketplaceFeeLabel,
  sameAuthority,
} from './marketplacePresentation'
import type { MarketplaceViewProps } from './marketplaceTypes'

export function MarketplaceAuctionDetail({ auction, props }: { auction: IndexedMarketplaceAuction; props: MarketplaceViewProps }) {
  const status = auctionStatus(auction, props.currentBlockHeight)
  const ownAuction = sameAuthority(auction.sellerAuthority, props.selectedAuthority)
  const leading = sameAuthority(auction.highestBid?.bidderAuthority, props.selectedAuthority)
  const watched = props.watchedNodes.includes(auction.node)
  const minimum = minimumBidDusk(auction)
  const marketplaceActivity = props.auctionActivity.filter((entry) => entry.eventType.startsWith('domain_'))

  return (
    <div className="marketplace-auction-detail" role="tabpanel">
      <button className="marketplace-back-button" type="button" onClick={props.onCloseAuction}>
        <ArrowLeft aria-hidden="true" size={15} /> All listings
      </button>

      <div className="marketplace-auction-hero">
        <div>
          <ListingName heading="h2" name={auction.name} size={64} />
          <p>{auction.startBlockHeight === null
            ? `The first confirmed bid starts a ${auctionDurationLabel(auction.durationBlocks)} countdown.`
            : 'The highest confirmed bid wins when the protected countdown ends.'}</p>
        </div>
        <div className="marketplace-auction-hero-actions">
          <span className={`status-badge ${auctionStatusTone(status)}`}>{auctionStatusLabel(status)}</span>
          <button
            aria-label={`${watched ? 'Stop watching' : 'Watch'} ${auction.name}`}
            aria-pressed={watched}
            className={`marketplace-watch-button labeled${watched ? ' active' : ''}`}
            type="button"
            onClick={() => props.onToggleWatch(auction.node)}
          >
            <Star aria-hidden="true" fill={watched ? 'currentColor' : 'none'} size={16} /> {watched ? 'Watching' : 'Watch'}
          </button>
        </div>
      </div>

      <div className="marketplace-auction-layout">
        <div className="marketplace-auction-main">
          <section className="marketplace-auction-facts" aria-labelledby="auction-details-heading">
            <div className="marketplace-section-heading">
              <h3 id="auction-details-heading" className="eyebrow">Details</h3>
            </div>
            <dl>
              <div><dt><UserRound aria-hidden="true" size={14} /> Seller</dt><dd><code>{abbreviate(auction.sellerAuthority)}</code></dd></div>
              <div><dt><Clock3 aria-hidden="true" size={14} /> Duration</dt><dd>{auctionDurationLabel(auction.durationBlocks)}</dd></div>
              <div><dt>Bids</dt><dd>{auction.bidCount}</dd></div>
              <div><dt>Marketplace fee</dt><dd>{marketplaceFeeLabel(auction.feeBps)} from seller proceeds</dd></div>
              <div><dt><ShieldCheck aria-hidden="true" size={14} /> Custody</dt><dd>{auction.escrowed ? 'Domain secured in escrow' : 'Escrow verification failed'}</dd></div>
              <div><dt>{auction.startBlockHeight === null ? 'Start window' : 'Closing rule'}</dt><dd>{auction.startBlockHeight === null ? auctionStartWindowLabel(auction, props.currentBlockHeight) : 'Late bids restore 10 minutes'}</dd></div>
            </dl>
          </section>

          <section className="marketplace-auction-activity" aria-labelledby="auction-activity-heading">
            <div className="marketplace-section-heading">
              <h3 id="auction-activity-heading" className="eyebrow">Bids · {marketplaceActivity.length}</h3>
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
            {props.auctionActivityHasMore ? <button className="text-button" disabled={props.auctionActivityLoading} type="button" onClick={props.onLoadMoreAuctionActivity}>Load more auction activity</button> : null}
          </section>
        </div>

        <aside className="marketplace-bid-panel" aria-label={`Bid on ${auction.name}`}>
          {leading ? <p className="marketplace-bidder-banner leading">{status === 'ended' ? 'You won — finalizing' : 'You’re the highest bidder'}</p> : null}
          {ownAuction ? <p className="marketplace-bidder-banner selling">You’re selling this domain</p> : null}
          <div className="marketplace-bid-price">
            <span>{auction.highestBid ? 'Current bid' : 'Reserve'}</span>
            <strong>{formatLuxNumberAsDusk(auction.highestBid?.amountLux ?? auction.reservePriceLux)}</strong>
            <small>{auction.bidCount} confirmed {auction.bidCount === 1 ? 'bid' : 'bids'}</small>
          </div>
          <div className="marketplace-bid-timer">
            <span>{auction.endBlockHeight === null ? 'Starts with first bid' : 'Time remaining'}</span>
            <strong>{auction.endBlockHeight === null ? auctionDurationLabel(auction.durationBlocks) : auctionTimeLabel(auction, props.currentBlockHeight)}</strong>
            <small>{auction.endBlockHeight === null ? `Start window: ${auctionStartWindowLabel(auction, props.currentBlockHeight)}` : 'Late bids can extend the closing time.'}</small>
          </div>

          <AuctionAction auction={auction} minimum={minimum} ownAuction={ownAuction} props={props} status={status} />
        </aside>
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
  props: MarketplaceViewProps
  status: ReturnType<typeof auctionStatus>
}) {
  if (status === 'ended') {
    return (
      <div className="marketplace-auction-action-stack">
        <p>The auction is over. Finalization transfers the domain and pays the seller.</p>
        <button className="primary-button compact" disabled={!props.actionsAvailable} type="button" onClick={() => props.onSettleAuction(auction)}>Finalize auction</button>
      </div>
    )
  }
  if (status === 'expired') {
    return (
      <div className="marketplace-auction-action-stack">
        <p>No bid started this auction before its deadline.</p>
        <button className="commit-button" disabled={!props.actionsAvailable} type="button" onClick={() => props.onExpireAuction(auction)}>Close auction</button>
      </div>
    )
  }
  if (ownAuction) {
    return auction.highestBid === null ? (
      <div className="marketplace-auction-action-stack">
        <p>You can cancel before the first bid. After bidding starts, the auction is binding.</p>
        <button className="commit-button" disabled={!props.actionsAvailable} type="button" onClick={() => props.onCancelAuction(auction)}>Cancel auction</button>
      </div>
    ) : (
      <div className="marketplace-auction-action-stack"><p>Your domain remains in escrow until the auction is finalized.</p></div>
    )
  }
  if (!props.selectedAddress) {
    return <button className="primary-button compact" type="button" onClick={props.onOpenWalletConnection}>Connect wallet to bid</button>
  }
  return (
    <div className="marketplace-auction-action-stack">
      <label className="marketplace-bid-field">
        <span>Your bid</span>
        <div className="marketplace-input-suffix">
          <input
            aria-describedby={`bid-help-${auction.node}`}
            aria-label={`Bid on ${auction.name}`}
            disabled={!props.actionsAvailable || !auction.escrowed}
            inputMode="decimal"
            type="text"
            value={props.bidDrafts[auction.node] ?? minimum}
            onChange={(event) => props.onBidDraftChange(auction.node, event.target.value)}
          />
          <span>DUSK</span>
        </div>
      </label>
      <div className="marketplace-minimum-row" id={`bid-help-${auction.node}`}>
        <span>Minimum {minimum} DUSK</span>
        <button type="button" onClick={() => props.onBidDraftChange(auction.node, minimum)}>Use minimum</button>
      </div>
      <button className="primary-button compact" disabled={!props.actionsAvailable || !auction.escrowed} type="button" onClick={() => props.onReviewBid(auction)}>Review bid</button>
      <p className="marketplace-custody-note">Your full bid is locked in the marketplace contract. If you’re outbid, it becomes withdrawable marketplace balance.</p>
    </div>
  )
}

function AuctionActivityRow({ currentBlockHeight, entry, viewerAuthority }: { currentBlockHeight: number | null; entry: ActivityEntry; viewerAuthority: string }) {
  const amount = marketplaceActivityAmount(entry)
  return (
    <li>
      <span className="marketplace-activity-icon"><Gavel aria-hidden="true" size={14} /></span>
      <div>
        <strong>{activityLabel(entry.eventType)}</strong>
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
  return formatLuxNumberAsDusk(value)
}
