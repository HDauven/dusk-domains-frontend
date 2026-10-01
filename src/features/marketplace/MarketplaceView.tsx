import { MarketplaceFreshness } from './MarketplaceFreshness'
import { Tabs, TabPanel } from '../../components/ui/Tabs'
import { Button } from '../../components/ui/Button'
import { Panel } from '../../components/ui/Panel'
import { RefreshCw, Store } from 'lucide-react'
import { isDuskDomainTxBusy } from '../../names/internal'
import { AccountPanel } from '../../components/ui/AccountPanel'
import { AccountViewHeader } from '../../components/ui/AccountViewHeader'
import { PanelFeedbackStack } from '../../components/ui/PanelFeedbackStack'
import { PanelMessage } from '../../components/ui/PanelMessage'
import { TransactionStatusNotice } from '../../components/status/TransactionStatusNotice'
import { MarketplaceActivity } from './MarketplaceActivity'
import { MarketplaceAuctionDetail } from './MarketplaceAuctionDetail'
import { MarketplaceAmount } from './MarketplaceAmount'
import { MarketplaceReview } from './MarketplaceReview'
import { MarketplaceBidReview } from './MarketplaceBidReview'
import { MarketplaceBrowse } from './MarketplaceBrowse'
import { MarketplaceOffers } from './MarketplaceOffers'
import { MarketplaceSell } from './MarketplaceSell'
import type { MarketplaceTab, MarketplaceViewProps } from './marketplaceTypes'

const tabs: Array<{ id: MarketplaceTab; label: string }> = [
  { id: 'browse', label: 'Browse' },
  { id: 'activity', label: 'Yours' },
  { id: 'sell', label: 'Sell' },
  { id: 'offers', label: 'Offers' },
]

export function MarketplaceView(props: MarketplaceViewProps) {
  const { actionsAvailable, confirmation, error, loading, marketplaceEnabled, onTabChange, refund, tab, txState } = props
  const selectedAuction = props.auctions.find((auction) => auction.node === props.selectedAuctionNode) ?? null

  return (
    <AccountPanel className="marketplace-panel" labelledBy="marketplace-heading" panelId="marketplace">
      {!props.selectedAuctionNode ? <AccountViewHeader
        description="Buy, sell and bid on .dusk names. Names and payments are held in escrow."
        heading="Market"
        headingId="marketplace-heading"
      /> : null}

      {!props.selectedAuctionNode ? <div className="marketplace-navigation"><Tabs id="marketplace-views" label="Marketplace views" items={tabs} value={tab} onChange={onTabChange} className="marketplace-tabs" /><MarketplaceFreshness updatedAt={props.updatedAt} /></div> : null}

      <PanelFeedbackStack confirmation={confirmation} error={error} />

      {!marketplaceEnabled ? (
        <PanelMessage icon={<Store size={18} />}>Marketplace is not enabled for this deployment.</PanelMessage>
      ) : null}
      {marketplaceEnabled && !actionsAvailable && !isDuskDomainTxBusy(txState) ? (
        <PanelMessage icon={<Store size={18} />} tone="subtle">Connect a wallet to transact.</PanelMessage>
      ) : null}

      {refund?.amountLux && tab !== 'activity' ? (
        <Panel as="div" className="marketplace-refund-bar">
          <div>
            <strong><MarketplaceAmount lux={refund.amountLux} /> ready to withdraw</strong>
            <span>Refunds stay in marketplace escrow until you withdraw them to your wallet.</span>
          </div>
          <Button disabled={!actionsAvailable} type="button" onClick={() => onTabChange('activity')}>
            Withdraw
          </Button>
        </Panel>
      ) : null}

      {txState?.status === 'executed' ? (
        <details className="marketplace-tx-details"><summary>Details</summary><p>Transaction <code>{txState.txId}</code></p></details>
      ) : txState ? <TransactionStatusNotice state={txState} /> : null}

      {loading && !props.fixedSales.length && !props.auctions.length && !props.offers.length ? (
        <PanelMessage icon={<RefreshCw size={18} />}>Loading marketplace</PanelMessage>
      ) : null}

      {props.selectedAuctionNode ? (
        selectedAuction ? <MarketplaceAuctionDetail auction={selectedAuction} props={props} /> : <div><h1 id="marketplace-heading">Auction</h1><PanelMessage icon={<Store size={18} />}>{loading ? 'Loading auction…' : 'This auction is no longer open.'}</PanelMessage><Button onClick={props.onCloseAuction}>All listings</Button></div>
      ) : <TabPanel id="marketplace-views" value={tab}>
        {marketplaceEnabled && tab === 'browse' && !selectedAuction ? <MarketplaceBrowse {...props} /> : null}
        {marketplaceEnabled && tab === 'activity' ? <MarketplaceActivity props={props} /> : null}
        {marketplaceEnabled && tab === 'sell' ? <MarketplaceSell {...props} /> : null}
        {marketplaceEnabled && tab === 'offers' ? <MarketplaceOffers {...props} /> : null}
        {marketplaceEnabled && props.hasMore && !selectedAuction && tab !== 'sell' ? (
          <Button variant="quiet" disabled={loading} type="button" onClick={props.onLoadMore}>Load more marketplace results</Button>
        ) : null}
      </TabPanel>}
      <MarketplaceBidReview props={props} />
      <MarketplaceReview review={props.review ?? null} disabled={Boolean(props.tradingPaused) || !actionsAvailable} onClose={() => props.onCancelReview?.()} onConfirm={() => props.onConfirmReview?.()} />
    </AccountPanel>
  )
}
