import { Store } from 'lucide-react'
import { PanelMessage } from '../../components/ui/PanelMessage'
import type { IndexedMarketplaceAuction, IndexedMarketplaceFixedSale } from '../../names/internal'
import { formatLuxNumberAsDusk } from '../treasury/feeConfig'
import { minimumBidDusk } from './auctionMath'
import { auctionTimeLabel, expiryTimeLabel, isExpired, sameAuthority } from './marketplacePresentation'
import type { MarketplaceViewProps } from './marketplaceTypes'

export function MarketplaceBrowse(props: MarketplaceViewProps) {
  const { auctions, fixedSales } = props
  if (!fixedSales.length && !auctions.length) {
    return <PanelMessage icon={<Store size={18} />} tone="subtle">No domains are for sale.</PanelMessage>
  }

  return (
    <div className="marketplace-sections" role="tabpanel">
      {fixedSales.length ? (
        <section className="marketplace-section" aria-labelledby="fixed-sales-heading">
          <div className="marketplace-section-heading">
            <div>
              <h2 id="fixed-sales-heading">Buy now</h2>
              <p>{fixedSales.length} {fixedSales.length === 1 ? 'domain' : 'domains'}</p>
            </div>
          </div>
          <div className="marketplace-list">
            {fixedSales.map((sale) => <FixedSaleRow key={sale.node} props={props} sale={sale} />)}
          </div>
        </section>
      ) : null}

      {auctions.length ? (
        <section className="marketplace-section" aria-labelledby="auctions-heading">
          <div className="marketplace-section-heading">
            <div>
              <h2 id="auctions-heading">Auctions</h2>
              <p>{auctions.length} {auctions.length === 1 ? 'auction' : 'auctions'}</p>
            </div>
          </div>
          <div className="marketplace-list">
            {auctions.map((auction) => <AuctionRow auction={auction} key={auction.node} props={props} />)}
          </div>
        </section>
      ) : null}
    </div>
  )
}

function FixedSaleRow({ props, sale }: { props: MarketplaceViewProps; sale: IndexedMarketplaceFixedSale }) {
  const ownSale = sameAuthority(sale.sellerAuthority, props.selectedAuthority)
  const expired = isExpired(sale.expiresAtBlockHeight, props.currentBlockHeight)
  const allowedBuyer = !sale.privateBuyer || sameAuthority(sale.privateBuyer, props.selectedAuthority)

  return (
    <article className="marketplace-order-row">
      <div className="marketplace-order-name">
        <strong>{sale.name}</strong>
        <span>{sale.privateBuyer ? 'Private sale' : 'Public sale'}</span>
      </div>
      <div>
        <span>Price</span>
        <strong>{formatLuxNumberAsDusk(sale.priceLux)}</strong>
      </div>
      <div>
        <span>{expired ? 'Status' : 'Expires'}</span>
        <strong>{expiryTimeLabel(sale.expiresAtBlockHeight, props.currentBlockHeight)}</strong>
      </div>
      <div className="marketplace-order-action">
        {expired ? (
          <button className="commit-button" disabled={!props.actionsAvailable} type="button" onClick={() => props.onExpireFixedSale(sale)}>Close</button>
        ) : ownSale ? (
          <button className="commit-button" disabled={!props.actionsAvailable} type="button" onClick={() => props.onCancelFixedSale(sale)}>Cancel</button>
        ) : !props.selectedAddress ? (
          <button className="primary-button compact" type="button" onClick={props.onOpenWalletConnection}>Connect to buy</button>
        ) : (
          <button className="primary-button compact" disabled={!props.actionsAvailable || !allowedBuyer || !sale.escrowed} type="button" onClick={() => props.onBuyFixedSale(sale)}>
            {allowedBuyer ? 'Buy' : 'Private sale'}
          </button>
        )}
      </div>
    </article>
  )
}

function AuctionRow({ auction, props }: { auction: IndexedMarketplaceAuction; props: MarketplaceViewProps }) {
  const ownAuction = sameAuthority(auction.sellerAuthority, props.selectedAuthority)
  const dormantExpired = auction.startBlockHeight === null
    && props.currentBlockHeight !== null
    && props.currentBlockHeight >= auction.startDeadlineBlockHeight
  const ended = auction.endBlockHeight !== null
    && props.currentBlockHeight !== null
    && props.currentBlockHeight >= auction.endBlockHeight
  const highestBid = auction.highestBid?.amountLux ?? null

  return (
    <article className="marketplace-order-row marketplace-auction-row">
      <div className="marketplace-order-name">
        <strong>{auction.name}</strong>
        <span>{auction.bidCount} {auction.bidCount === 1 ? 'bid' : 'bids'}</span>
      </div>
      <div>
        <span>{highestBid === null ? 'Reserve' : 'Highest bid'}</span>
        <strong>{formatLuxNumberAsDusk(highestBid ?? auction.reservePriceLux)}</strong>
      </div>
      <div>
        <span>{auction.endBlockHeight === null ? 'Window' : 'Time left'}</span>
        <strong>{dormantExpired ? 'Not started' : auctionTimeLabel(auction, props.currentBlockHeight)}</strong>
      </div>
      <div className="marketplace-order-action">
        {ended ? (
          <button className="commit-button" disabled={!props.actionsAvailable} type="button" onClick={() => props.onSettleAuction(auction)}>Settle</button>
        ) : dormantExpired ? (
          <button className="commit-button" disabled={!props.actionsAvailable} type="button" onClick={() => props.onExpireAuction(auction)}>Close</button>
        ) : ownAuction && auction.highestBid === null ? (
          <button className="commit-button" disabled={!props.actionsAvailable} type="button" onClick={() => props.onCancelAuction(auction)}>Cancel</button>
        ) : ownAuction ? (
          <span className="marketplace-live-label">Auction live</span>
        ) : !props.selectedAddress ? (
          <button className="primary-button compact" type="button" onClick={props.onOpenWalletConnection}>Connect to bid</button>
        ) : (
          <div className="marketplace-bid-control">
            <input
              aria-label={`Bid on ${auction.name}`}
              disabled={!props.actionsAvailable || !auction.escrowed}
              inputMode="decimal"
              type="text"
              value={props.bidDrafts[auction.node] ?? minimumBidDusk(auction)}
              onChange={(event) => props.onBidDraftChange(auction.node, event.target.value)}
            />
            <button className="primary-button compact" disabled={!props.actionsAvailable || !auction.escrowed} type="button" onClick={() => props.onPlaceBid(auction)}>Bid</button>
          </div>
        )}
      </div>
    </article>
  )
}
