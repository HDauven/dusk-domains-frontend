import { useState } from 'react'
import { abbreviate } from '../../utils/format'
import { Panel } from '../../components/ui/Panel'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { HandCoins } from 'lucide-react'
import { PanelMessage } from '../../components/ui/PanelMessage'
import type { IndexedMarketplaceOffer } from '../../names/internal'
import { MarketplaceAmount } from './MarketplaceAmount'
import { expiryTimeLabel, isExpired, sameAuthority } from './marketplacePresentation'
import type { MarketplaceViewProps } from './marketplaceTypes'

const durations = [1, 3, 7, 14, 30]

export function MarketplaceOffers(props: MarketplaceViewProps) {
  const ownedNodes = new Set(props.sellableNames.map((name) => name.node))
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('recent')
  const [query, setQuery] = useState('')
  const offers = props.offers.filter((offer) => (
    offer.name.toLowerCase().includes(query.trim().toLowerCase())
    && (filter !== 'sent' || sameAuthority(offer.buyerAuthority, props.selectedAuthority))
    && (filter !== 'received' || ownedNodes.has(offer.node))
  )).sort((left, right) => sort === 'ending' ? left.expiresAtBlockHeight - right.expiresAtBlockHeight
    : sort === 'price-high' ? right.amountLux - left.amountLux : right.placedAtBlockHeight - left.placedAtBlockHeight)

  return (
    <div className="marketplace-offers-layout">
      <Panel className="marketplace-editor" aria-labelledby="make-offer-heading">
        <div className="marketplace-section-heading">
          <div>
            <h2 id="make-offer-heading">Make an offer</h2>
            <p>Your DUSK waits in escrow until the owner accepts, you cancel, or the offer runs out.</p>
          </div>
        </div>
        {!props.selectedAddress ? (
          <Button variant="primary" className="compact" type="button" onClick={props.onOpenWalletConnection}>Connect wallet</Button>
        ) : (
          <>
            <div className="marketplace-form">
              <label className="marketplace-field-wide">
                <span>Name</span>
                <Input placeholder="name.dusk" type="text" value={props.offerName} onChange={(event) => props.onOfferNameChange(event.target.value)} />
              </label>
              <label>
                <span>Offer</span>
                <div className="marketplace-input-suffix"><Input inputMode="decimal" type="text" value={props.offerAmountDusk} onChange={(event) => props.onOfferAmountDuskChange(event.target.value)} /><span>DUSK</span></div>
              </label>
              <label>
                <span>Valid for</span>
                <Select value={props.offerDurationDays} onChange={(event) => props.onOfferDurationDaysChange(event.target.value)}>
                  {durations.map((days) => <option key={days} value={days}>{days} {days === 1 ? 'day' : 'days'}</option>)}
                </Select>
              </label>
            </div>
            <Button variant="primary" className="compact" disabled={props.tradingPaused || !props.actionsAvailable} type="button" onClick={props.onPlaceOffer}>Place offer</Button>
          </>
        )}
      </Panel>

      <section className="marketplace-section" aria-labelledby="your-offers-heading">
        <div className="marketplace-section-heading">
          <h2 id="your-offers-heading" className="eyebrow">Offers · {offers.length}</h2>
        </div>
        <div className="marketplace-offer-filters">
          <label><span className="sr-only">Search offers</span><Input type="search" placeholder="Search offers" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <label><span className="sr-only">Filter offers</span><Select aria-label="Filter offers" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All offers</option><option value="received">Received</option><option value="sent">Sent</option></Select></label>
          <label><span className="sr-only">Sort offers</span><Select aria-label="Sort offers" value={sort} onChange={(event) => setSort(event.target.value)}><option value="recent">Newest first</option><option value="ending">Ending soon</option><option value="price-high">Highest offer</option></Select></label>
        </div>
        {!offers.length ? (
          <PanelMessage icon={<HandCoins size={18} />} tone="subtle">{props.offers.length ? 'No matching offers. Change your search or filters.' : 'No offers yet. Make an offer on a registered name.'}</PanelMessage>
        ) : (
          <div className="marketplace-list">
            {offers.map((offer) => <OfferRow incoming={ownedNodes.has(offer.node)} key={`${offer.node}:${offer.buyerAuthority}`} offer={offer} props={props} />)}
          </div>
        )}
      </section>
    </div>
  )
}

function OfferRow({ incoming, offer, props }: { incoming: boolean; offer: IndexedMarketplaceOffer; props: MarketplaceViewProps }) {
  const ownOffer = sameAuthority(offer.buyerAuthority, props.selectedAuthority)
  const expired = isExpired(offer.expiresAtBlockHeight, props.currentBlockHeight)
  return (
    <article className="marketplace-order-row marketplace-offer-row">
      <div className="marketplace-order-name"><strong>{offer.name}</strong><span>{incoming ? 'Received · ' : ''}Buyer {ownOffer ? 'You' : abbreviate(offer.buyerAuthority)}</span></div>
      <div><span>Offer</span><strong><MarketplaceAmount lux={offer.amountLux} /></strong></div>
      <div><span>{expired ? 'Status' : 'Expires'}</span><strong>{expiryTimeLabel(offer.expiresAtBlockHeight, props.currentBlockHeight)}</strong></div>
      <div className="marketplace-order-action">
        {expired ? (
          <Button disabled={!props.actionsAvailable} type="button" onClick={() => props.onExpireOffer(offer)}>Close</Button>
        ) : incoming ? (
          <Button variant="primary" className="compact" disabled={props.tradingPaused || !props.actionsAvailable} type="button" onClick={() => props.onAcceptOffer(offer)}>Accept</Button>
        ) : ownOffer ? (
          <Button disabled={!props.actionsAvailable} type="button" onClick={() => props.onCancelOffer(offer)}>Cancel</Button>
        ) : null}
      </div>
    </article>
  )
}
