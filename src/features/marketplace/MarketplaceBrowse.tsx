import { marketplaceOrderKey } from './orderIdentity'
import { NamespaceSummary } from './NamespaceSummary'
import { OwnerLabel } from '../identity/OwnerLabel'
import { Badge } from '../../components/ui/Badge'
import { Input, Select } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { ChoiceRow } from '../../components/ui/ChoiceRow'
import { Panel } from '../../components/ui/Panel'
import { Clock3, Gavel, Search, Star } from 'lucide-react'
import { PanelMessage } from '../../components/ui/PanelMessage'
import type { IndexedMarketplaceAuction, IndexedMarketplaceFixedSale } from '../../names/internal'
import { MarketplaceAmount } from './MarketplaceAmount'
import { compactLuxAsDusk } from './auctionMath'
import { ListingName } from './ListingName'
import {
  auctionDurationLabel,
  auctionStatus,
  auctionStatusLabel,
  auctionStatusTone,
  auctionTimeLabel,
  expiryTimeLabel,
  isExpired,
  sameAuthority,
} from './marketplacePresentation'
import { useMarketplaceBrowse } from './useMarketplaceBrowse'
import type { MarketplaceBrowseProps } from './marketplaceTypes'

export function MarketplaceBrowse(props: MarketplaceBrowseProps) {
  const { filter, setFilter, query, setQuery, sort, setSort, watched, results } = useMarketplaceBrowse(props.listings.fixedSales, props.listings.auctions, props.watchlist.watchedNodes)
  if (!props.listings.fixedSales.length && !props.listings.auctions.length) {
    return <PanelMessage icon={<Gavel size={18} />} tone="subtle">No names for sale yet. <Button variant="quiet" onClick={() => props.navigation.onTabChange('sell')}>List a name</Button><a href="/">Browse names</a></PanelMessage>
  }

  return (
    <div className="marketplace-browse">
      <div className="marketplace-discovery-bar">
        <label className="marketplace-search-control">
          <Search aria-hidden="true" size={16} />
          <span className="sr-only">Search marketplace</span>
          <Input
            aria-label="Search marketplace"
            placeholder="Search names for sale"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <ChoiceRow className="tabs marketplace-filter-control" label="Marketplace filters" value={filter}>
          {([
            ['all', 'All'],
            ['auction', 'Auctions'],
            ['buy-now', 'Buy now'],
            ['watching', `Watching ${props.watchlist.watchedNodes.length || ''}`.trim()],
          ] as const).map(([id, label]) => (
            <Button aria-pressed={filter === id} className={filter === id ? 'active' : ''} key={id} type="button" onClick={() => setFilter(id)}>{label}</Button>
          ))}
        </ChoiceRow>
        <label className="marketplace-sort-control">
          <span>Sort</span>
          <Select aria-label="Sort marketplace" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
            <option value="ending">Ending soon</option>
            <option value="recent">Recently listed</option>
            <option value="price-low">Price: low first</option>
            <option value="price-high">Price: high first</option>
          </Select>
        </label>
      </div>

      {!results.length ? (
        <PanelMessage icon={<Search size={18} />} tone="subtle">{filter === 'watching' ? 'No watched listings. Use the star on a listing to save it here.' : 'No matching listings. Change your search or filters.'}</PanelMessage>
      ) : (
        <div className="marketplace-card-grid" aria-label="Listings">
          {results.map((order) => order.kind === 'auction'
            ? <AuctionCard auction={order.value} key={marketplaceOrderKey(order.value)} props={props} watched={watched.has(order.value.node)} />
            : <FixedSaleCard sale={order.value} key={marketplaceOrderKey(order.value)} props={props} watched={watched.has(order.value.node)} />)}
        </div>
      )}
    </div>
  )
}

function AuctionCard({ auction, props, watched }: { auction: IndexedMarketplaceAuction; props: MarketplaceBrowseProps; watched: boolean }) {
  const status = auctionStatus(auction, props.market.currentBlockHeight)
  const ownAuction = sameAuthority(auction.sellerAuthority, props.wallet.selectedAuthority)
  const leading = sameAuthority(auction.highestBid?.bidderAuthority, props.wallet.selectedAuthority)
  const amount = auction.highestBid?.amountLux ?? auction.reservePriceLux

  return (
    <Panel as="article" className="marketplace-card marketplace-auction-card">
      <div className="marketplace-card-topline">
        <Badge tone={auctionStatusTone(status)}>{auctionStatusLabel(status)}</Badge>
        <Button variant="quiet"
          aria-label={`${watched ? 'Stop watching' : 'Watch'} ${auction.name}`}
          aria-pressed={watched}
          className={`marketplace-watch-button${watched ? ' active' : ''}`}
          type="button"
          onClick={() => props.watchlist.onToggleWatch(auction.node)}
        >
          <Star aria-hidden="true" fill={watched ? 'currentColor' : 'none'} size={17} />
        </Button>
      </div>
      <ListingName name={auction.name} />
      <NamespaceSummary namespace={auction.namespace} />
      <div className="marketplace-owner">Seller <OwnerLabel authority={auction.sellerAuthority} viewerAuthority={props.wallet.selectedAuthority} addresses={props.wallet.ownerAddresses} compact /></div>
      {leading ? <p className="marketplace-personal-status leading">{status === 'settlement_expired' ? 'Close auction for refund' : status === 'ended' ? 'You won — finalizing' : 'You’re the highest bidder'}</p> : null}
      {ownAuction ? <><p className="marketplace-personal-status selling">Your auction</p><p>Renewal is available after the listing closes.</p></> : null}
      <dl className="marketplace-card-metrics">
        <div><dt>{auction.highestBid ? 'Current bid' : 'Reserve'}</dt><dd><MarketplaceAmount lux={amount} /></dd></div>
        <div>
          <dt><Clock3 aria-hidden="true" size={13} /> {auction.endBlockHeight === null ? 'Duration' : 'Time remaining'}</dt>
          <dd>{auction.endBlockHeight === null ? auctionDurationLabel(auction.durationBlocks) : auctionTimeLabel(auction, props.market.currentBlockHeight)}</dd>
        </div>
      </dl>
      <Button className="marketplace-card-action" type="button" onClick={() => props.auction.onOpenAuction(marketplaceOrderKey(auction))}>
        View auction
      </Button>
    </Panel>
  )
}

function FixedSaleCard({ props, sale, watched }: { props: MarketplaceBrowseProps; sale: IndexedMarketplaceFixedSale; watched: boolean }) {
  const ownSale = sameAuthority(sale.sellerAuthority, props.wallet.selectedAuthority)
  const expired = isExpired(sale.expiresAtBlockHeight, props.market.currentBlockHeight)
  const allowedBuyer = !sale.privateBuyer || sameAuthority(sale.privateBuyer, props.wallet.selectedAuthority)

  return (
    <Panel as="article" className="marketplace-card marketplace-fixed-card">
      <div className="marketplace-card-topline">
        <Badge tone={expired ? 'danger' : 'neutral'}>{expired ? 'Listing expired' : sale.privateBuyer ? 'Private sale' : 'Buy now'}</Badge>
        <Button variant="quiet"
          aria-label={`${watched ? 'Stop watching' : 'Watch'} ${sale.name}`}
          aria-pressed={watched}
          className={`marketplace-watch-button${watched ? ' active' : ''}`}
          type="button"
          onClick={() => props.watchlist.onToggleWatch(sale.node)}
        >
          <Star aria-hidden="true" fill={watched ? 'currentColor' : 'none'} size={17} />
        </Button>
      </div>
      <ListingName name={sale.name} />
      <NamespaceSummary namespace={sale.namespace} />
      <div className="marketplace-owner">Seller <OwnerLabel authority={sale.sellerAuthority} viewerAuthority={props.wallet.selectedAuthority} addresses={props.wallet.ownerAddresses} compact /></div>
      {ownSale ? <><p className="marketplace-personal-status selling">Your listing</p><p>Renewal is available after the listing closes.</p></> : null}
      <dl className="marketplace-card-metrics">
        <div><dt>Price</dt><dd><MarketplaceAmount lux={sale.priceLux} /></dd></div>
        <div><dt><Clock3 aria-hidden="true" size={13} /> {expired ? 'Ended' : 'Expires'}</dt><dd>{expiryTimeLabel(sale.expiresAtBlockHeight, props.market.currentBlockHeight)}</dd></div>
      </dl>
      <div className="marketplace-card-action">
        {sale.returnPending ? (
          <Button disabled={!props.wallet.actionsAvailable} type="button" onClick={() => props.listings.onCancelFixedSale(sale)}>Return name</Button>
        ) : expired ? (
          <Button disabled={!props.wallet.actionsAvailable} type="button" onClick={() => props.listings.onExpireFixedSale(sale)}>Close listing</Button>
        ) : ownSale ? (
          <Button disabled={!props.wallet.actionsAvailable} type="button" onClick={() => props.listings.onCancelFixedSale(sale)}>Cancel listing</Button>
        ) : !props.wallet.selectedAddress ? (
          <Button type="button" onClick={props.wallet.onOpenWalletConnection}>Connect to buy</Button>
        ) : (
          <Button disabled={!props.wallet.actionsAvailable || !allowedBuyer || !sale.escrowed} type="button" onClick={() => props.listings.onBuyFixedSale(sale)}>
            {allowedBuyer ? `Buy for ${compactLuxAsDusk(BigInt(sale.priceLux))} DUSK` : 'Private sale'}
          </Button>
        )}
      </div>
    </Panel>
  )
}
