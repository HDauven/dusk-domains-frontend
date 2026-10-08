import { ReadNotice } from '../../components/status/ReadNotice'
import { matchesAuctionSelection } from './orderIdentity'
import { useContext } from 'react'
import { NetworkFreshnessContext } from '../../app/networkFreshness'
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
import { MARKETPLACE_SYNC_MESSAGE } from './marketplacePresentation'
import { MarketplaceActivity } from './MarketplaceActivity'
import { MarketplaceAuctionDetail } from './MarketplaceAuctionDetail'
import { MarketplaceReview } from './MarketplaceReview'
import { MarketplaceAmount } from './MarketplaceAmount'
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
  const { wallet: { actionsAvailable }, feedback: { confirmation, error, txState }, market: { loading, marketplaceEnabled }, navigation: { onTabChange, tab }, withdrawal: { refund } } = props
  const networkNotice = useContext(NetworkFreshnessContext)
  const unread = props.market.hasData === false
  const readError = props.market.readError || networkNotice || ''
  const syncing = error === MARKETPLACE_SYNC_MESSAGE
  const selectedAuction = props.listings.auctions.find((auction) => matchesAuctionSelection(auction, props.auction.selectedAuctionNode)) ?? null

  return (
    <AccountPanel className="marketplace-panel" labelledBy="marketplace-heading" panelId="marketplace">
      {!props.auction.selectedAuctionNode ? <AccountViewHeader
        description="Buy, sell and bid on .dusk names. Names and payments are held in escrow."
        heading="Market"
        headingId="marketplace-heading"
      /> : null}

      {!props.auction.selectedAuctionNode ? <div className="marketplace-navigation"><Tabs id="marketplace-views" label="Marketplace views" items={tabs} value={tab} onChange={onTabChange} className="marketplace-tabs" /><MarketplaceFreshness updatedAt={syncing ? null : props.market.updatedAt} /></div> : null}

      {props.takeBackOffers?.map(offer => <Panel key={offer.name}>
        <p>{offer.name}: the seller still holds {offer.count} subnames. Taking them back clears their records and primary names.</p>
        <Button disabled={!actionsAvailable} onClick={offer.takeBack}>Take back {offer.count} subnames</Button>
      </Panel>)}
      {readError ? <ReadNotice error={readError} hasData={!unread} onRetry={props.market.onRetry} /> : null}
      <PanelFeedbackStack confirmation={confirmation} error={syncing ? undefined : error} />
      {!readError && syncing && !networkNotice ? <p className="marketplace-freshness" role="status">{error}</p> : null}

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

      {!readError && loading && !props.listings.fixedSales.length && !props.listings.auctions.length && !props.offers.offers.length ? (
        <PanelMessage icon={<RefreshCw size={18} />}>Loading marketplace</PanelMessage>
      ) : null}

      {unread ? (props.auction.selectedAuctionNode ? <h1 id="marketplace-heading">Auction</h1> : null) : props.auction.selectedAuctionNode ? (
        selectedAuction ? <MarketplaceAuctionDetail selectedAuction={selectedAuction} {...props} /> : <div><h1 id="marketplace-heading">Auction</h1><PanelMessage icon={<Store size={18} />}>{loading ? 'Loading auction…' : 'This auction is no longer open.'}</PanelMessage><Button onClick={props.auction.onCloseAuction}>All listings</Button></div>
      ) : <TabPanel id="marketplace-views" value={tab}>
        {marketplaceEnabled && tab === 'browse' && !selectedAuction ? <MarketplaceBrowse {...props} /> : null}
        {marketplaceEnabled && tab === 'activity' ? <MarketplaceActivity {...props} /> : null}
        {marketplaceEnabled && tab === 'sell' ? <MarketplaceSell {...props} /> : null}
        {marketplaceEnabled && tab === 'offers' ? <MarketplaceOffers {...props} /> : null}
        {marketplaceEnabled && props.market.hasMore && !selectedAuction && tab !== 'sell' ? (
          <Button variant="quiet" disabled={loading} type="button" onClick={props.market.onLoadMore}>Load more marketplace results</Button>
        ) : null}
      </TabPanel>}
      <MarketplaceBidReview {...props} />
      <MarketplaceReview review={props.feedback.review ?? null} disabled={Boolean(props.wallet.tradingPaused && props.feedback.review?.createsOrder) || !actionsAvailable} onClose={() => props.feedback.onCancelReview?.()} onConfirm={() => props.feedback.onConfirmReview?.()} />
    </AccountPanel>
  )
}
