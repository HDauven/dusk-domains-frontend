import { Button } from '../../components/ui/Button'
import { Panel } from '../../components/ui/Panel'
import { Eye, Gavel, HandCoins, Tag, Trophy, WalletCards } from 'lucide-react'
import type { ReactNode } from 'react'
import { PanelMessage } from '../../components/ui/PanelMessage'
import { MarketplaceAmount } from './MarketplaceAmount'
import { auctionStatus, auctionTimeLabel, expiryTimeLabel, sameAuthority } from './marketplacePresentation'
import type { MarketplaceActivityProps } from './marketplaceTypes'

export function MarketplaceActivity(props: MarketplaceActivityProps) {
  const topBidder = props.listings.auctions.filter((auction) => sameAuthority(auction.highestBid?.bidderAuthority, props.wallet.selectedAuthority))
  const won = topBidder.filter((auction) => auctionStatus(auction, props.market.currentBlockHeight) === 'ended')
  const leading = topBidder.filter((auction) => auctionStatus(auction, props.market.currentBlockHeight) !== 'ended')
  const sellingAuctions = props.listings.auctions.filter((auction) => sameAuthority(auction.sellerAuthority, props.wallet.selectedAuthority))
  const sellingFixed = props.listings.fixedSales.filter((sale) => sameAuthority(sale.sellerAuthority, props.wallet.selectedAuthority))
  const sentOffers = props.offers.offers.filter((offer) => sameAuthority(offer.buyerAuthority, props.wallet.selectedAuthority))
  const watchedOrders = [
    ...props.listings.auctions.filter((auction) => props.watchlist.watchedNodes.includes(auction.node)),
    ...props.listings.fixedSales.filter((sale) => props.watchlist.watchedNodes.includes(sale.node)),
  ]
  const hasActivity = leading.length || won.length || sellingAuctions.length || sellingFixed.length || sentOffers.length || props.withdrawal.refund || watchedOrders.length

  if (!props.wallet.selectedAddress) {
    return (
      <div className="marketplace-my-view">
        <PanelMessage icon={<WalletCards size={18} />} tone="subtle">
          <Button variant="quiet" type="button" onClick={props.wallet.onOpenWalletConnection}>Connect your wallet</Button> to see bids, listings, offers and marketplace funds.
        </PanelMessage>
      </div>
    )
  }

  return (
    <div className="marketplace-my-view">
      {hasActivity ? <div className="marketplace-position-summary" aria-label="Your marketplace summary">
        <div><Trophy aria-hidden="true" size={18} /><strong>{leading.length + won.length}</strong><span>Winning</span></div>
        <div><Gavel aria-hidden="true" size={18} /><strong>{sellingAuctions.length + sellingFixed.length}</strong><span>Selling</span></div>
        <div><HandCoins aria-hidden="true" size={18} /><strong>{sentOffers.length}</strong><span>Offers sent</span></div>
        <div><Eye aria-hidden="true" size={18} /><strong>{watchedOrders.length}</strong><span>Watching</span></div>
      </div> : null}

      {props.withdrawal.refund?.amountLux ? (
        <Panel className="marketplace-balance-card" aria-labelledby="marketplace-balance-heading">
          <div>
            <span>Refund ready to withdraw</span>
            <strong id="marketplace-balance-heading">{<MarketplaceAmount lux={props.withdrawal.refund.amountLux} />}</strong>
            <p>Funds from an outbid or closed offer stay in marketplace escrow until you withdraw them.</p>
          </div>
          <Button variant="primary" className="compact" disabled={!props.wallet.actionsAvailable} type="button" onClick={props.withdrawal.onClaimRefund}>Withdraw to wallet</Button>
        </Panel>
      ) : null}

      {!hasActivity ? <PanelMessage icon={<WalletCards size={18} />} tone="subtle">No bids, listings or offers yet. <Button variant="quiet" onClick={() => props.navigation.onTabChange('browse')}>Browse listings</Button></PanelMessage> : null}

      {won.length ? (
        <PositionSection count={won.length} description="Finalize a won auction to receive the name." heading="Won — finalizing" icon={<Trophy size={17} />}>
          {won.map((auction) => (
            <PositionRow
              action="View result"
              key={auction.node}
              label={auction.name}
              meta="Auction ended"
              value={<MarketplaceAmount lux={auction.highestBid?.amountLux ?? auction.reservePriceLux} />}
              onOpen={() => props.auction.onOpenAuction(auction.node)}
            />
          ))}
        </PositionSection>
      ) : null}

      {leading.length ? (
        <PositionSection count={leading.length} description="Auctions where your wallet currently leads." heading="Leading bids" icon={<Trophy size={17} />}>
          {leading.map((auction) => (
            <PositionRow
              action="View auction"
              key={auction.node}
              label={auction.name}
              meta={auctionTimeLabel(auction, props.market.currentBlockHeight)}
              value={<MarketplaceAmount lux={auction.highestBid?.amountLux ?? auction.reservePriceLux} />}
              onOpen={() => props.auction.onOpenAuction(auction.node)}
            />
          ))}
        </PositionSection>
      ) : null}

      {sellingAuctions.length || sellingFixed.length ? (
        <PositionSection count={sellingAuctions.length + sellingFixed.length} description="Names held in marketplace escrow." heading="Your listings" icon={<Tag size={17} />}>
          {sellingAuctions.map((auction) => (
            <PositionRow
              action="Manage auction"
              key={auction.node}
              label={auction.name}
              meta={auctionTimeLabel(auction, props.market.currentBlockHeight)}
              value={auction.highestBid ? <MarketplaceAmount lux={auction.highestBid.amountLux} /> : <>Reserve <MarketplaceAmount lux={auction.reservePriceLux} /></>}
              onOpen={() => props.auction.onOpenAuction(auction.node)}
            />
          ))}
          {sellingFixed.map((sale) => (
            <PositionRow
              action="View listing"
              key={sale.node}
              label={sale.name}
              meta={`Expires ${expiryTimeLabel(sale.expiresAtBlockHeight, props.market.currentBlockHeight)}`}
              value={<MarketplaceAmount lux={sale.priceLux} />}
              onOpen={() => props.navigation.onTabChange('browse')}
            />
          ))}
        </PositionSection>
      ) : null}

      {sentOffers.length ? (
        <PositionSection count={sentOffers.length} description="Funds committed to active offers." heading="Offers sent" icon={<HandCoins size={17} />}>
          {sentOffers.map((offer) => (
            <PositionRow
              action="Manage offers"
              key={`${offer.node}:${offer.buyerAuthority}`}
              label={offer.name}
              meta={`Expires ${expiryTimeLabel(offer.expiresAtBlockHeight, props.market.currentBlockHeight)}`}
              value={<MarketplaceAmount lux={offer.amountLux} />}
              onOpen={() => props.navigation.onTabChange('offers')}
            />
          ))}
        </PositionSection>
      ) : null}

      {watchedOrders.length ? <p className="marketplace-watch-note">Watching is stored on this device. Auction notifications require this app to be open.</p> : null}
    </div>
  )
}

function PositionSection({ children, count, description, heading, icon }: { children: ReactNode; count: number; description: string; heading: string; icon: ReactNode }) {
  const id = `marketplace-position-${heading.toLowerCase().replace(/\s+/gu, '-')}`
  return (
    <Panel className="marketplace-position-section" aria-labelledby={id}>
      <div className="marketplace-section-heading">
        <h2 id={id}>{icon} {heading} <span>· {count}</span></h2>
        <p>{description}</p>
      </div>
      <div className="marketplace-position-list">{children}</div>
    </Panel>
  )
}

function PositionRow({ action, label, meta, onOpen, value }: { action: string; label: string; meta: string; onOpen: () => void; value: ReactNode }) {
  return (
    <article className="marketplace-position-row">
      <div><strong>{label}</strong><span>{meta}</span></div>
      <strong>{value}</strong>
      <Button type="button" onClick={onOpen}>{action}</Button>
    </article>
  )
}
