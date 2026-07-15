import { HandCoins } from 'lucide-react'
import { PanelMessage } from '../../components/ui/PanelMessage'
import type { IndexedMarketplaceOffer } from '../../names/internal'
import { formatLuxNumberAsDusk } from '../treasury/feeConfig'
import { expiryTimeLabel, isExpired, sameAuthority } from './marketplacePresentation'
import type { MarketplaceViewProps } from './marketplaceTypes'

const durations = [1, 3, 7, 14, 30]

export function MarketplaceOffers(props: MarketplaceViewProps) {
  const ownedNodes = new Set(props.sellableNames.map((name) => name.node))
  const ownOffers = props.offers.filter((offer) => sameAuthority(offer.buyerAuthority, props.selectedAuthority))
  const incomingOffers = props.offers.filter((offer) => ownedNodes.has(offer.node) && !sameAuthority(offer.buyerAuthority, props.selectedAuthority))

  return (
    <div className="marketplace-offers-layout" role="tabpanel">
      <section className="marketplace-editor" aria-labelledby="make-offer-heading">
        <div className="marketplace-section-heading">
          <div>
            <h2 id="make-offer-heading">Make an offer</h2>
            <p>Funds stay in escrow until accepted, canceled or expired.</p>
          </div>
        </div>
        {!props.selectedAddress ? (
          <button className="primary-button compact" type="button" onClick={props.onOpenWalletConnection}>Connect wallet</button>
        ) : (
          <>
            <div className="marketplace-form">
              <label className="marketplace-field-wide">
                <span>Domain</span>
                <input placeholder="domain.dusk" type="text" value={props.offerName} onChange={(event) => props.onOfferNameChange(event.target.value)} />
              </label>
              <label>
                <span>Offer</span>
                <div className="marketplace-input-suffix"><input inputMode="decimal" type="text" value={props.offerAmountDusk} onChange={(event) => props.onOfferAmountDuskChange(event.target.value)} /><span>DUSK</span></div>
              </label>
              <label>
                <span>Valid for</span>
                <select value={props.offerDurationDays} onChange={(event) => props.onOfferDurationDaysChange(event.target.value)}>
                  {durations.map((days) => <option key={days} value={days}>{days} {days === 1 ? 'day' : 'days'}</option>)}
                </select>
              </label>
            </div>
            <button className="commit-button ready" disabled={!props.actionsAvailable} type="button" onClick={props.onPlaceOffer}>Place offer</button>
          </>
        )}
      </section>

      <section className="marketplace-section" aria-labelledby="your-offers-heading">
        <div className="marketplace-section-heading">
          <div><h2 id="your-offers-heading">Your offers</h2><p>{ownOffers.length + incomingOffers.length} active</p></div>
        </div>
        {!ownOffers.length && !incomingOffers.length ? (
          <PanelMessage icon={<HandCoins size={18} />} tone="subtle">No active offers.</PanelMessage>
        ) : (
          <div className="marketplace-list">
            {incomingOffers.map((offer) => <OfferRow incoming key={`${offer.node}:${offer.buyerAuthority}`} offer={offer} props={props} />)}
            {ownOffers.map((offer) => <OfferRow incoming={false} key={`${offer.node}:${offer.buyerAuthority}`} offer={offer} props={props} />)}
          </div>
        )}
      </section>
    </div>
  )
}

function OfferRow({ incoming, offer, props }: { incoming: boolean; offer: IndexedMarketplaceOffer; props: MarketplaceViewProps }) {
  const expired = isExpired(offer.expiresAtBlockHeight, props.currentBlockHeight)
  return (
    <article className="marketplace-order-row marketplace-offer-row">
      <div className="marketplace-order-name"><strong>{offer.name}</strong><span>{incoming ? 'Received' : 'Sent'}</span></div>
      <div><span>Offer</span><strong>{formatLuxNumberAsDusk(offer.amountLux)}</strong></div>
      <div><span>{expired ? 'Status' : 'Expires'}</span><strong>{expiryTimeLabel(offer.expiresAtBlockHeight, props.currentBlockHeight)}</strong></div>
      <div className="marketplace-order-action">
        {expired ? (
          <button className="commit-button" disabled={!props.actionsAvailable} type="button" onClick={() => props.onExpireOffer(offer)}>Close</button>
        ) : incoming ? (
          <button className="primary-button compact" disabled={!props.actionsAvailable} type="button" onClick={() => props.onAcceptOffer(offer)}>Accept</button>
        ) : (
          <button className="commit-button" disabled={!props.actionsAvailable} type="button" onClick={() => props.onCancelOffer(offer)}>Cancel</button>
        )}
      </div>
    </article>
  )
}
