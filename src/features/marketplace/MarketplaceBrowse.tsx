import { Clock3, Gavel, Search, Star, Tag } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PanelMessage } from '../../components/ui/PanelMessage'
import type { IndexedMarketplaceAuction, IndexedMarketplaceFixedSale } from '../../names/internal'
import { formatLuxNumberAsDusk } from '../treasury/feeConfig'
import { minimumBidDusk } from './auctionMath'
import {
  auctionDurationLabel,
  auctionStartWindowLabel,
  auctionStatus,
  auctionStatusLabel,
  auctionTimeLabel,
  expiryTimeLabel,
  isExpired,
  sameAuthority,
} from './marketplacePresentation'
import type { MarketplaceViewProps } from './marketplaceTypes'

type MarketFilter = 'all' | 'auction' | 'buy-now' | 'watching'
type MarketSort = 'ending' | 'recent' | 'price-low'

export function MarketplaceBrowse(props: MarketplaceViewProps) {
  const [filter, setFilter] = useState<MarketFilter>('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<MarketSort>('ending')
  const watched = useMemo(() => new Set(props.watchedNodes), [props.watchedNodes])
  const normalizedQuery = query.trim().toLowerCase()
  const matches = (name: string, node: string) => (
    (!normalizedQuery || name.toLowerCase().includes(normalizedQuery))
    && (filter !== 'watching' || watched.has(node))
  )
  const fixedSales = props.fixedSales
    .filter((sale) => filter !== 'auction' && matches(sale.name, sale.node))
    .toSorted((left, right) => compareFixedSales(left, right, sort))
  const auctions = props.auctions
    .filter((auction) => filter !== 'buy-now' && matches(auction.name, auction.node))
    .toSorted((left, right) => compareAuctions(left, right, sort))
  const hasOrders = props.fixedSales.length > 0 || props.auctions.length > 0

  if (!hasOrders) {
    return <PanelMessage icon={<Gavel size={18} />} tone="subtle">No domains are for sale.</PanelMessage>
  }

  return (
    <div className="marketplace-browse" role="tabpanel">
      <div className="marketplace-discovery-bar">
        <label className="marketplace-search-control">
          <Search aria-hidden="true" size={16} />
          <span className="sr-only">Search marketplace</span>
          <input
            aria-label="Search marketplace"
            placeholder="Search .dusk domains"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="marketplace-filter-control" aria-label="Marketplace filters">
          {([
            ['all', 'All'],
            ['auction', 'Auctions'],
            ['buy-now', 'Buy now'],
            ['watching', `Watching ${props.watchedNodes.length || ''}`.trim()],
          ] as Array<[MarketFilter, string]>).map(([id, label]) => (
            <button className={filter === id ? 'active' : ''} key={id} type="button" onClick={() => setFilter(id)}>{label}</button>
          ))}
        </div>
        <label className="marketplace-sort-control">
          <span>Sort</span>
          <select aria-label="Sort marketplace" value={sort} onChange={(event) => setSort(event.target.value as MarketSort)}>
            <option value="ending">Ending soon</option>
            <option value="recent">Recently listed</option>
            <option value="price-low">Price: low first</option>
          </select>
        </label>
      </div>

      {!fixedSales.length && !auctions.length ? (
        <PanelMessage icon={<Search size={18} />} tone="subtle">No listings match those filters.</PanelMessage>
      ) : null}

      {auctions.length ? (
        <section className="marketplace-section" aria-labelledby="auctions-heading">
          <div className="marketplace-section-heading">
            <div>
              <h2 id="auctions-heading">Auctions</h2>
              <p>Open bidding with a protected closing window.</p>
            </div>
            <span className="marketplace-result-count">{auctions.length}</span>
          </div>
          <div className="marketplace-card-grid">
            {auctions.map((auction) => <AuctionCard auction={auction} key={auction.node} props={props} watched={watched.has(auction.node)} />)}
          </div>
        </section>
      ) : null}

      {fixedSales.length ? (
        <section className="marketplace-section" aria-labelledby="fixed-sales-heading">
          <div className="marketplace-section-heading">
            <div>
              <h2 id="fixed-sales-heading">Buy now</h2>
              <p>Purchase immediately at the listed price.</p>
            </div>
            <span className="marketplace-result-count">{fixedSales.length}</span>
          </div>
          <div className="marketplace-card-grid">
            {fixedSales.map((sale) => <FixedSaleCard key={sale.node} props={props} sale={sale} watched={watched.has(sale.node)} />)}
          </div>
        </section>
      ) : null}
    </div>
  )
}

function AuctionCard({ auction, props, watched }: { auction: IndexedMarketplaceAuction; props: MarketplaceViewProps; watched: boolean }) {
  const status = auctionStatus(auction, props.currentBlockHeight)
  const ownAuction = sameAuthority(auction.sellerAuthority, props.selectedAuthority)
  const leading = sameAuthority(auction.highestBid?.bidderAuthority, props.selectedAuthority)
  const amount = auction.highestBid?.amountLux ?? auction.reservePriceLux

  return (
    <article className="marketplace-card marketplace-auction-card">
      <div className="marketplace-card-topline">
        <span className={`marketplace-status-badge ${status}`}>{auctionStatusLabel(status)}</span>
        <button
          aria-label={`${watched ? 'Stop watching' : 'Watch'} ${auction.name}`}
          aria-pressed={watched}
          className={`marketplace-watch-button${watched ? ' active' : ''}`}
          type="button"
          onClick={() => props.onToggleWatch(auction.node)}
        >
          <Star aria-hidden="true" fill={watched ? 'currentColor' : 'none'} size={17} />
        </button>
      </div>
      <div className="marketplace-card-name">
        <Gavel aria-hidden="true" size={19} />
        <div><h3>{auction.name}</h3><p>{auction.bidCount} {auction.bidCount === 1 ? 'bid' : 'bids'}</p></div>
      </div>
      {leading ? <p className="marketplace-personal-status leading">{status === 'ended' ? 'You won — finalizing' : 'You’re the highest bidder'}</p> : null}
      {ownAuction ? <p className="marketplace-personal-status selling">Your auction</p> : null}
      <dl className="marketplace-card-metrics">
        <div><dt>{auction.highestBid ? 'Current bid' : 'Reserve'}</dt><dd>{formatLuxNumberAsDusk(amount)}</dd></div>
        <div><dt>{auction.highestBid ? 'Minimum next bid' : 'Minimum bid'}</dt><dd>{minimumBidDusk(auction)} DUSK</dd></div>
        <div>
          <dt><Clock3 aria-hidden="true" size={13} /> {auction.endBlockHeight === null ? 'Starts by' : 'Time remaining'}</dt>
          <dd>{auction.endBlockHeight === null ? auctionStartWindowLabel(auction, props.currentBlockHeight) : auctionTimeLabel(auction, props.currentBlockHeight)}</dd>
        </div>
      </dl>
      <p className="marketplace-card-note">
        {auction.startBlockHeight === null
          ? `${auctionDurationLabel(auction.durationBlocks)} once the first bid is confirmed.`
          : 'Late bids can extend the closing time.'}
      </p>
      <button className="primary-button compact marketplace-card-action" type="button" onClick={() => props.onOpenAuction(auction.node)}>
        View auction
      </button>
    </article>
  )
}

function FixedSaleCard({ props, sale, watched }: { props: MarketplaceViewProps; sale: IndexedMarketplaceFixedSale; watched: boolean }) {
  const ownSale = sameAuthority(sale.sellerAuthority, props.selectedAuthority)
  const expired = isExpired(sale.expiresAtBlockHeight, props.currentBlockHeight)
  const allowedBuyer = !sale.privateBuyer || sameAuthority(sale.privateBuyer, props.selectedAuthority)

  return (
    <article className="marketplace-card marketplace-fixed-card">
      <div className="marketplace-card-topline">
        <span className={`marketplace-status-badge ${expired ? 'expired' : 'buy-now'}`}>{expired ? 'Listing expired' : 'Buy now'}</span>
        <button
          aria-label={`${watched ? 'Stop watching' : 'Watch'} ${sale.name}`}
          aria-pressed={watched}
          className={`marketplace-watch-button${watched ? ' active' : ''}`}
          type="button"
          onClick={() => props.onToggleWatch(sale.node)}
        >
          <Star aria-hidden="true" fill={watched ? 'currentColor' : 'none'} size={17} />
        </button>
      </div>
      <div className="marketplace-card-name">
        <Tag aria-hidden="true" size={19} />
        <div><h3>{sale.name}</h3><p>{sale.privateBuyer ? 'Private sale' : 'Available to anyone'}</p></div>
      </div>
      {ownSale ? <p className="marketplace-personal-status selling">Your listing</p> : null}
      <dl className="marketplace-card-metrics">
        <div><dt>Price</dt><dd>{formatLuxNumberAsDusk(sale.priceLux)}</dd></div>
        <div><dt>Status</dt><dd>{sale.escrowed ? 'Secured in escrow' : 'Unavailable'}</dd></div>
        <div><dt><Clock3 aria-hidden="true" size={13} /> {expired ? 'Ended' : 'Expires'}</dt><dd>{expiryTimeLabel(sale.expiresAtBlockHeight, props.currentBlockHeight)}</dd></div>
      </dl>
      <div className="marketplace-card-action">
        {expired ? (
          <button className="commit-button" disabled={!props.actionsAvailable} type="button" onClick={() => props.onExpireFixedSale(sale)}>Close listing</button>
        ) : ownSale ? (
          <button className="commit-button" disabled={!props.actionsAvailable} type="button" onClick={() => props.onCancelFixedSale(sale)}>Cancel listing</button>
        ) : !props.selectedAddress ? (
          <button className="primary-button compact" type="button" onClick={props.onOpenWalletConnection}>Connect to buy</button>
        ) : (
          <button className="primary-button compact" disabled={!props.actionsAvailable || !allowedBuyer || !sale.escrowed} type="button" onClick={() => props.onBuyFixedSale(sale)}>
            {allowedBuyer ? `Buy for ${formatLuxNumberAsDusk(sale.priceLux)}` : 'Private sale'}
          </button>
        )}
      </div>
    </article>
  )
}

function compareFixedSales(left: IndexedMarketplaceFixedSale, right: IndexedMarketplaceFixedSale, sort: MarketSort) {
  if (sort === 'recent') return right.openedAtBlockHeight - left.openedAtBlockHeight
  if (sort === 'price-low') return left.priceLux - right.priceLux
  return left.expiresAtBlockHeight - right.expiresAtBlockHeight
}

function compareAuctions(left: IndexedMarketplaceAuction, right: IndexedMarketplaceAuction, sort: MarketSort) {
  if (sort === 'recent') return right.createdAtBlockHeight - left.createdAtBlockHeight
  if (sort === 'price-low') {
    return (left.highestBid?.amountLux ?? left.reservePriceLux) - (right.highestBid?.amountLux ?? right.reservePriceLux)
  }
  return (left.endBlockHeight ?? left.startDeadlineBlockHeight) - (right.endBlockHeight ?? right.startDeadlineBlockHeight)
}
