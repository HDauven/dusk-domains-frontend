import { Eye, Gavel, HandCoins, Tag, Trophy, WalletCards } from 'lucide-react'
import type { ReactNode } from 'react'
import { PanelMessage } from '../../components/ui/PanelMessage'
import { formatLuxNumberAsDusk } from '../treasury/feeConfig'
import { auctionStatus, auctionTimeLabel, expiryTimeLabel, sameAuthority } from './marketplacePresentation'
import type { MarketplaceViewProps } from './marketplaceTypes'

export function MarketplaceActivity({ props }: { props: MarketplaceViewProps }) {
  const topBidder = props.auctions.filter((auction) => sameAuthority(auction.highestBid?.bidderAuthority, props.selectedAuthority))
  const won = topBidder.filter((auction) => auctionStatus(auction, props.currentBlockHeight) === 'ended')
  const leading = topBidder.filter((auction) => auctionStatus(auction, props.currentBlockHeight) !== 'ended')
  const sellingAuctions = props.auctions.filter((auction) => sameAuthority(auction.sellerAuthority, props.selectedAuthority))
  const sellingFixed = props.fixedSales.filter((sale) => sameAuthority(sale.sellerAuthority, props.selectedAuthority))
  const sentOffers = props.offers.filter((offer) => sameAuthority(offer.buyerAuthority, props.selectedAuthority))
  const watchedOrders = [
    ...props.auctions.filter((auction) => props.watchedNodes.includes(auction.node)),
    ...props.fixedSales.filter((sale) => props.watchedNodes.includes(sale.node)),
  ]
  const hasActivity = leading.length || won.length || sellingAuctions.length || sellingFixed.length || sentOffers.length || props.refund || watchedOrders.length

  if (!props.selectedAddress) {
    return (
      <div className="marketplace-my-view" role="tabpanel">
        <PanelMessage icon={<WalletCards size={18} />} tone="subtle">
          <button className="text-action" type="button" onClick={props.onOpenWalletConnection}>Connect your wallet</button> to see bids, listings, offers and marketplace funds.
        </PanelMessage>
      </div>
    )
  }

  return (
    <div className="marketplace-my-view" role="tabpanel">
      <div className="marketplace-position-summary" aria-label="Your marketplace summary">
        <div><Trophy aria-hidden="true" size={18} /><strong>{leading.length + won.length}</strong><span>Winning</span></div>
        <div><Gavel aria-hidden="true" size={18} /><strong>{sellingAuctions.length + sellingFixed.length}</strong><span>Selling</span></div>
        <div><HandCoins aria-hidden="true" size={18} /><strong>{sentOffers.length}</strong><span>Offers sent</span></div>
        <div><Eye aria-hidden="true" size={18} /><strong>{watchedOrders.length}</strong><span>Watching</span></div>
      </div>

      {props.refund?.amountLux ? (
        <section className="marketplace-balance-card" aria-labelledby="marketplace-balance-heading">
          <div>
            <span>Withdrawable marketplace balance</span>
            <strong id="marketplace-balance-heading">{formatLuxNumberAsDusk(props.refund.amountLux)}</strong>
            <p>Funds returned from an outbid or closed order are safe in the marketplace contract until withdrawn.</p>
          </div>
          <button className="primary-button compact" disabled={!props.actionsAvailable} type="button" onClick={props.onClaimRefund}>Withdraw to wallet</button>
        </section>
      ) : null}

      {!hasActivity ? <PanelMessage icon={<WalletCards size={18} />} tone="subtle">No marketplace positions yet.</PanelMessage> : null}

      {won.length ? (
        <PositionSection count={won.length} description="Won auctions awaiting automatic or manual finalization." heading="Won — finalizing" icon={<Trophy size={17} />}>
          {won.map((auction) => (
            <PositionRow
              action="View result"
              key={auction.node}
              label={auction.name}
              meta="Auction ended"
              value={formatLuxNumberAsDusk(auction.highestBid?.amountLux ?? auction.reservePriceLux)}
              onOpen={() => props.onOpenAuction(auction.node)}
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
              meta={auctionTimeLabel(auction, props.currentBlockHeight)}
              value={formatLuxNumberAsDusk(auction.highestBid?.amountLux ?? auction.reservePriceLux)}
              onOpen={() => props.onOpenAuction(auction.node)}
            />
          ))}
        </PositionSection>
      ) : null}

      {sellingAuctions.length || sellingFixed.length ? (
        <PositionSection count={sellingAuctions.length + sellingFixed.length} description="Domains currently secured in marketplace escrow." heading="Your listings" icon={<Tag size={17} />}>
          {sellingAuctions.map((auction) => (
            <PositionRow
              action="Manage auction"
              key={auction.node}
              label={auction.name}
              meta={auctionTimeLabel(auction, props.currentBlockHeight)}
              value={auction.highestBid ? formatLuxNumberAsDusk(auction.highestBid.amountLux) : `Reserve ${formatLuxNumberAsDusk(auction.reservePriceLux)}`}
              onOpen={() => props.onOpenAuction(auction.node)}
            />
          ))}
          {sellingFixed.map((sale) => (
            <PositionRow
              action="Marketplace"
              key={sale.node}
              label={sale.name}
              meta={`Expires ${expiryTimeLabel(sale.expiresAtBlockHeight, props.currentBlockHeight)}`}
              value={formatLuxNumberAsDusk(sale.priceLux)}
              onOpen={() => props.onTabChange('browse')}
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
              meta={`Expires ${expiryTimeLabel(offer.expiresAtBlockHeight, props.currentBlockHeight)}`}
              value={formatLuxNumberAsDusk(offer.amountLux)}
              onOpen={() => props.onTabChange('offers')}
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
    <section className="marketplace-position-section" aria-labelledby={id}>
      <div className="marketplace-section-heading">
        <div><h2 id={id}>{icon} {heading}</h2><p>{description}</p></div>
        <span className="marketplace-result-count">{count}</span>
      </div>
      <div className="marketplace-position-list">{children}</div>
    </section>
  )
}

function PositionRow({ action, label, meta, onOpen, value }: { action: string; label: string; meta: string; onOpen: () => void; value: string }) {
  return (
    <article className="marketplace-position-row">
      <div><strong>{label}</strong><span>{meta}</span></div>
      <strong>{value}</strong>
      <button className="commit-button" type="button" onClick={onOpen}>{action}</button>
    </article>
  )
}
