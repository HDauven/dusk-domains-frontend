import { RefreshCw, Store } from 'lucide-react'
import { AccountPanel } from '../../components/ui/AccountPanel'
import { AccountViewHeader } from '../../components/ui/AccountViewHeader'
import { PanelFeedbackStack } from '../../components/ui/PanelFeedbackStack'
import { PanelMessage } from '../../components/ui/PanelMessage'
import { RefreshButton } from '../../components/ui/RefreshButton'
import { TransactionStatusNotice } from '../../components/status/TransactionStatusNotice'
import { MarketplaceActivity } from './MarketplaceActivity'
import { MarketplaceAuctionDetail } from './MarketplaceAuctionDetail'
import { MarketplaceBidReview } from './MarketplaceBidReview'
import { MarketplaceBrowse } from './MarketplaceBrowse'
import { MarketplaceOffers } from './MarketplaceOffers'
import { MarketplaceSell } from './MarketplaceSell'
import type { MarketplaceTab, MarketplaceViewProps } from './marketplaceTypes'

const tabs: Array<{ id: MarketplaceTab; label: string }> = [
  { id: 'browse', label: 'Browse' },
  { id: 'activity', label: 'My marketplace' },
  { id: 'sell', label: 'Sell' },
  { id: 'offers', label: 'Offers' },
]

export function MarketplaceView(props: MarketplaceViewProps) {
  const { actionsAvailable, confirmation, error, loading, marketplaceEnabled, onRefresh, onTabChange, refund, tab, txState } = props
  const selectedAuction = props.auctions.find((auction) => auction.node === props.selectedAuctionNode) ?? null

  return (
    <AccountPanel className="marketplace-panel" labelledBy="marketplace-heading" panelId="marketplace">
      <AccountViewHeader
        actions={<RefreshButton disabled={loading} loading={loading} onRefresh={onRefresh} />}
        description="Buy, sell or bid on .dusk domains."
        heading="Marketplace"
        headingId="marketplace-heading"
      />

      <div aria-label="Marketplace views" className="marketplace-tabs" role="tablist">
        {tabs.map((item) => (
          <button
            aria-selected={tab === item.id}
            className={tab === item.id ? 'active' : ''}
            key={item.id}
            role="tab"
            type="button"
            onClick={() => onTabChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <PanelFeedbackStack confirmation={confirmation} error={error} />

      {!marketplaceEnabled ? (
        <PanelMessage icon={<Store size={18} />}>Marketplace is not enabled for this deployment.</PanelMessage>
      ) : null}
      {marketplaceEnabled && !actionsAvailable ? (
        <PanelMessage icon={<Store size={18} />} tone="subtle">Connect a wallet to transact.</PanelMessage>
      ) : null}

      {refund?.amountLux ? (
        <div className="marketplace-refund-bar">
          <div>
            <span>Marketplace funds available</span>
            <strong>Outbid or returned funds are ready to withdraw.</strong>
          </div>
          <button className="commit-button" disabled={!actionsAvailable} type="button" onClick={() => onTabChange('activity')}>
            View balance
          </button>
        </div>
      ) : null}

      {txState ? <TransactionStatusNotice state={txState} /> : null}

      {loading && !props.fixedSales.length && !props.auctions.length && !props.offers.length ? (
        <PanelMessage icon={<RefreshCw size={18} />}>Loading marketplace</PanelMessage>
      ) : null}

      {marketplaceEnabled && tab === 'browse' && selectedAuction ? <MarketplaceAuctionDetail auction={selectedAuction} props={props} /> : null}
      {marketplaceEnabled && tab === 'browse' && !selectedAuction ? <MarketplaceBrowse {...props} /> : null}
      {marketplaceEnabled && tab === 'activity' ? <MarketplaceActivity props={props} /> : null}
      {marketplaceEnabled && tab === 'sell' ? <MarketplaceSell {...props} /> : null}
      {marketplaceEnabled && tab === 'offers' ? <MarketplaceOffers {...props} /> : null}
      <MarketplaceBidReview props={props} />
    </AccountPanel>
  )
}
