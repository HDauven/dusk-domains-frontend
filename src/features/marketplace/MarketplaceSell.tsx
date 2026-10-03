import { NamespaceSummary } from './NamespaceSummary'
import { Button } from '../../components/ui/Button'
import { Panel } from '../../components/ui/Panel'
import { Select, Input } from '../../components/ui/Input'
import { Store } from 'lucide-react'
import { PanelMessage } from '../../components/ui/PanelMessage'
import { MarketplaceReviewSummary } from './MarketplaceReviewSummary'
import { validLuxAmount } from './auctionMath'
import { proceedsRows } from './marketplaceFees'
import { abbreviate } from '../../utils/format'
import type { MarketplaceSellProps } from './marketplaceTypes'

const durations = [1, 3, 7, 14, 30]

export function MarketplaceSell(props: MarketplaceSellProps) {
  const selectedName = props.selling.sellableNames.find((name) => name.node === props.selling.selectedNode)

  const amount = validLuxAmount(props.selling.saleMode === 'auction' ? props.selling.reserveDusk : props.selling.fixedPriceDusk)

  return (
    <div className="marketplace-form-view">
      {!props.wallet.selectedAddress ? (
        <PanelMessage icon={<Store size={18} />} tone="subtle">
          <Button variant="quiet" type="button" onClick={props.wallet.onOpenWalletConnection}>Connect your wallet</Button> to sell a name.
        </PanelMessage>
      ) : props.selling.sellableNames.length === 0 ? (
        <PanelMessage icon={<Store size={18} />} tone="subtle">No eligible names to sell. You need an active .dusk name with no existing listing. <a href="/">Find a name</a></PanelMessage>
      ) : (
        <Panel className="marketplace-editor" aria-labelledby="sell-domain-heading">
          <div className="marketplace-section-heading">
            <div>
              <h2 id="sell-domain-heading">Sell a name</h2>
              <p>It moves into escrow until it sells or you cancel.</p>
            </div>
            <div className="marketplace-mode-control" aria-label="Sale type">
              <Button aria-pressed={props.selling.saleMode === 'fixed'} type="button" onClick={() => props.selling.onSaleModeChange('fixed')}>Fixed price</Button>
              <Button aria-pressed={props.selling.saleMode === 'auction'} type="button" onClick={() => props.selling.onSaleModeChange('auction')}>Auction</Button>
            </div>
          </div>

          <div className="marketplace-form">
            <label className="marketplace-field-wide">
              <span>Name</span>
              <Select value={props.selling.selectedNode || ''} onChange={(event) => props.selling.onSelectedNodeChange(event.target.value)}>
                {!selectedName ? <option value="">Choose a name</option> : null}
                {props.selling.sellableNames.map((name) => <option key={name.node} value={name.node}>{name.canonicalName}</option>)}
              </Select>
            </label>

            {props.selling.saleMode === 'fixed' ? (
              <>
                <label>
                  <span>Price</span>
                  <div className="marketplace-input-suffix"><Input inputMode="decimal" type="text" value={props.selling.fixedPriceDusk} onChange={(event) => props.selling.onFixedPriceDuskChange(event.target.value)} /><span>DUSK</span></div>
                </label>
                <label>
                  <span>Private buyer (optional)</span>
                  <Input placeholder="Dusk address" type="text" value={props.selling.privateBuyer} onChange={(event) => props.selling.onPrivateBuyerChange(event.target.value)} />
                </label>
              </>
            ) : (
              <label className="marketplace-field-wide">
                <span>Minimum bid</span>
                <div className="marketplace-input-suffix"><Input inputMode="decimal" type="text" value={props.selling.reserveDusk} onChange={(event) => props.selling.onReserveDuskChange(event.target.value)} /><span>DUSK</span></div>
              </label>
            )}

            <label className="marketplace-field-wide">
              <span>{props.selling.saleMode === 'auction' ? 'Auction duration' : 'Listing duration'}</span>
              <Select value={props.selling.durationDays} onChange={(event) => props.selling.onDurationDaysChange(event.target.value)}>
                {durations.map((days) => <option key={days} value={days}>{days} {days === 1 ? 'day' : 'days'}</option>)}
              </Select>
            </label>
          </div>

          {props.selling.feeBps != null && amount !== null ? <MarketplaceReviewSummary ariaLabel="Seller proceeds" rows={proceedsRows(amount, props.selling.feeBps)} /> : <p className="field-note">{props.selling.feeBps == null ? 'Loading marketplace fee…' : 'Enter an amount to see the fee and proceeds.'}</p>}
          {props.selling.saleMode === 'auction' ? <p className="field-note">Proceeds shown at the minimum bid. Starts when someone bids, then runs {props.selling.durationDays} {props.selling.durationDays === '1' ? 'day' : 'days'}. Bids in the last 10 minutes extend it.</p> : null}
          <div className="marketplace-review-line">
            <span>Payout</span>
            <code>{abbreviate(props.wallet.selectedAddress)}</code>
          </div>

          <NamespaceSummary namespace={selectedName?.namespace} />
          <p className="field-note">The buyer controls the whole namespace. Subnames themselves can’t be sold.</p>

          <Button variant="primary" className="compact" disabled={props.wallet.tradingPaused || !props.wallet.actionsAvailable || props.selling.feeBps == null || !selectedName} type="button" onClick={() => props.selling.onCreateListing()}>
            {props.selling.saleMode === 'auction' ? 'Start auction' : 'List for sale'}
          </Button>
        </Panel>
      )}
    </div>
  )
}
