import { Store } from 'lucide-react'
import { PanelMessage } from '../../components/ui/PanelMessage'
import { abbreviate } from '../../utils/format'
import type { MarketplaceViewProps } from './marketplaceTypes'

const durations = [1, 3, 7, 14, 30]

export function MarketplaceSell(props: MarketplaceViewProps) {
  const selectedName = props.sellableNames.find((name) => name.node === props.selectedNode) ?? props.sellableNames[0]

  return (
    <div className="marketplace-form-view" role="tabpanel">
      {!props.selectedAddress ? (
        <PanelMessage icon={<Store size={18} />} tone="subtle">
          <button className="text-action" type="button" onClick={props.onOpenWalletConnection}>Connect your wallet</button> to sell a domain.
        </PanelMessage>
      ) : props.sellableNames.length === 0 ? (
        <PanelMessage icon={<Store size={18} />} tone="subtle">You have no domains available to sell.</PanelMessage>
      ) : (
        <section className="marketplace-editor" aria-labelledby="sell-domain-heading">
          <div className="marketplace-section-heading">
            <div>
              <h2 id="sell-domain-heading">Sell a domain</h2>
              <p>The domain moves into marketplace escrow until sold or canceled.</p>
            </div>
            <div className="marketplace-mode-control" aria-label="Sale type">
              <button className={props.saleMode === 'fixed' ? 'active' : ''} type="button" onClick={() => props.onSaleModeChange('fixed')}>Fixed price</button>
              <button className={props.saleMode === 'auction' ? 'active' : ''} type="button" onClick={() => props.onSaleModeChange('auction')}>Auction</button>
            </div>
          </div>

          <div className="marketplace-form">
            <label className="marketplace-field-wide">
              <span>Domain</span>
              <select value={props.selectedNode || selectedName?.node || ''} onChange={(event) => props.onSelectedNodeChange(event.target.value)}>
                {props.sellableNames.map((name) => <option key={name.node} value={name.node}>{name.canonicalName}</option>)}
              </select>
            </label>

            {props.saleMode === 'fixed' ? (
              <>
                <label>
                  <span>Price</span>
                  <div className="marketplace-input-suffix"><input inputMode="decimal" type="text" value={props.fixedPriceDusk} onChange={(event) => props.onFixedPriceDuskChange(event.target.value)} /><span>DUSK</span></div>
                </label>
                <label>
                  <span>Buyer</span>
                  <input placeholder="Anyone" type="text" value={props.privateBuyer} onChange={(event) => props.onPrivateBuyerChange(event.target.value)} />
                </label>
              </>
            ) : (
              <label className="marketplace-field-wide">
                <span>Reserve</span>
                <div className="marketplace-input-suffix"><input inputMode="decimal" type="text" value={props.reserveDusk} onChange={(event) => props.onReserveDuskChange(event.target.value)} /><span>DUSK</span></div>
              </label>
            )}

            <label className="marketplace-field-wide">
              <span>{props.saleMode === 'auction' ? 'Auction duration' : 'Listing duration'}</span>
              <select value={props.durationDays} onChange={(event) => props.onDurationDaysChange(event.target.value)}>
                {durations.map((days) => <option key={days} value={days}>{days} {days === 1 ? 'day' : 'days'}</option>)}
              </select>
            </label>
          </div>

          <div className="marketplace-review-line">
            <span>Payout</span>
            <code>{abbreviate(props.selectedAddress)}</code>
          </div>

          <p className="field-note">Only second-level domains without subdomains can be sold.</p>

          <button className="commit-button ready" disabled={!props.actionsAvailable} type="button" onClick={props.onCreateListing}>
            {props.saleMode === 'auction' ? 'Create auction' : 'List domain'}
          </button>
        </section>
      )}
    </div>
  )
}
