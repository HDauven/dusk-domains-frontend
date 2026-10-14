import { purchaseTakeBackCall, sellerHeldSubnames } from './namespaceTakeBack'
import { canonicalOwnedName } from './canonicalMarketplaceState'
import { userFacingErrorMessage, type IndexedNameSummary } from '../../names/internal'
import { useMarketAddresses } from './useMarketAddresses'
import { useState } from 'react'
import type { SubmitNameWrite } from '../../app/useDuskDomainWriter'
import type { AppRoute } from '../../app/routes'
import type { LiveWritePreflight } from '../../app/useLiveWritePreflight'
import {
  isDuskDomainTxBusy,
  type DuskDomainsIndexerClient,
  type DuskDomainsMarketplaceOnChainClient,
  type DuskDomainsOnChainClient,
  type DuskDomainsRuntimeConfig,
  type DuskDomainTxState,
} from '../../names/internal'
import { marketplaceErrorAfterRefresh } from './marketplacePresentation'
import { useScopedState } from '../../utils/useScopedState'
import type { MarketplaceTab, MarketplaceViewProps } from './marketplaceTypes'
import { useAuctions } from './useAuctions'
import { useMarketplaceData } from './useMarketplaceData'
import { useMarketplaceWrites } from './useMarketplaceWrites'
import { useFixedSales } from './useFixedSales'
import { useOffers } from './useOffers'
import { useSellInventory } from './useSellInventory'
import { useMarketplaceRefund } from './useMarketplaceRefund'
import { useSellForm } from './useSellForm'
import { useWatchlist } from './watchlist'
import { useListingLink } from './useListingLink'
import { MARKET_FEE_UNKNOWN, MARKET_NOT_TAKING_BIDS, marketTakesNewOrders } from './marketAvailability'
import type { IndexedMarketplaceAuction } from '../../names/internal'

type UseMarketplaceFeatureArgs = {
  tradingPaused: boolean
  /** The market the directory prefers now, which takes new orders; null while it can't be read. */
  preferredMarketplace: string | null
  ensurePublicBalanceForLiveWrite: LiveWritePreflight['ensurePublicBalanceForLiveWrite']
  indexerClient: DuskDomainsIndexerClient | null
  duskDomainsOnChainClient: DuskDomainsOnChainClient | null
  liveWritesAvailable: boolean
  marketplaceOnChainClient: DuskDomainsMarketplaceOnChainClient | null
  mainView: string
  /** The route the app started at, so a market link opens its tab or auction on first render. */
  openingRoute?: AppRoute
  onOpenWalletConnection: () => void
  runtimeConfig: DuskDomainsRuntimeConfig
  selectedAddress: string
  selectedAuthority: string
  submitNameWrite: SubmitNameWrite
}

/** The market a route opens: a sell link's Sell tab, an offer link's Offers tab, or a linked auction. */
export function marketOpening(route?: AppRoute): { tab: MarketplaceTab, sellName: string, offerName: string, auctionNode: string, listingName: string } {
  const market = route?.view === 'marketplace' ? route : null
  return {
    tab: market?.sellName ? 'sell' : market?.offerName ? 'offers' : 'browse',
    sellName: market?.sellName ?? '',
    offerName: market?.offerName ?? '',
    auctionNode: market?.auctionNode ?? '',
    listingName: market?.listingName ?? '',
  }
}

// The market: data and writes are shared, and each tab's state lives in its own hook.
export function useMarketplaceFeature(args: UseMarketplaceFeatureArgs) {
  const {
    duskDomainsOnChainClient,
    indexerClient,
    liveWritesAvailable,
    mainView,
    marketplaceOnChainClient,
    onOpenWalletConnection,
    runtimeConfig,
    selectedAddress,
    selectedAuthority,
  } = args
  const marketScope = `${runtimeConfig.chainId}:${runtimeConfig.contracts.marketplace?.contractId}`
  const accountScope = `${marketScope}:${selectedAuthority}`
  const [opening] = useState(() => marketOpening(args.openingRoute))
  const [sellName, setSellName] = useState(opening.sellName)
  // The name an offer link asked for. The form's name field starts from it.
  const [offerName, setOfferName] = useState(opening.offerName)
  // The listing a link asked for. The Browse search starts with its name.
  const listingLink = useListingLink(opening.listingName)
  const [tab, setTab] = useState<MarketplaceTab>(opening.tab)
  // Auction selection belongs to the market, so wallet restoration keeps the detail open.
  const [selectedAuctionNode, setSelectedAuctionNode] = useScopedState(marketScope, opening.auctionNode)

  // Feedback belongs to the tab it came from.
  const feedbackScope = `${accountScope}:${mainView}:${tab}:${selectedAuctionNode}`
  const [error, setError] = useScopedState(feedbackScope, '')
  const [confirmation, setConfirmation] = useScopedState(feedbackScope, '')
  const [txState, setTxState] = useScopedState<DuskDomainTxState | null>(feedbackScope, null)

  const { toggleWatch, watch, watchedNodes } = useWatchlist()
  const marketplaceEnabled = Boolean(runtimeConfig.capabilities.marketplace && runtimeConfig.contracts.marketplace)
  const actionsAvailable = marketplaceEnabled
    && !isDuskDomainTxBusy(txState)
    && liveWritesAvailable
    && Boolean(marketplaceOnChainClient)
    && Boolean(duskDomainsOnChainClient)
  // New orders go to the preferred market, which governance can change after this site was built.
  // Existing orders keep the market they were placed at.
  const marketplaceContractId = args.preferredMarketplace ?? ''

  const data = useMarketplaceData({ accountScope, indexerClient, listingName: listingLink.listingName, mainView, onLoaded: () => setError(marketplaceErrorAfterRefresh), preferredMarketplace: args.preferredMarketplace, selectedAddress, selectedAuctionNode, selectedAuthority, setError })
  const { auctions, fixedSales, loadMarketplace, ownedNames, refunds } = data
  // The preferred market's fee is unknown while the indexer hasn't authenticated its configuration:
  // it then takes no new listing or offer here, and no fee is assumed.
  const newOrdersRefusal = data.feeStatus === 'unknown' ? MARKET_FEE_UNKNOWN : null
  // Bids go to the auction's own market, which may be draining, paused or unconfigured.
  const bidRefusal = (auction: IndexedMarketplaceAuction) => marketTakesNewOrders(auction.marketplaceContractId,
    { marketplaces: data.marketplaces, preferred: args.preferredMarketplace, tradingPaused: args.tradingPaused }) ? null : MARKET_NOT_TAKING_BIDS

  const writes = useMarketplaceWrites({
    ...args,
    actionsAvailable,
    feedbackScope: tab === 'sell' ? `${feedbackScope}:${data.feeBps}` : feedbackScope,
    feedback: { setConfirmation, setError, setTxState },
    loadMarketplace,
  })

  const { sellableNames, selectedName, selectedNode, setSelectedNode } = useSellInventory({ accountScope, ownedNames, auctions, fixedSales, selectedAuthority, requestedName: sellName })
  const claimRefund = useMarketplaceRefund(writes)

  const sell = useSellForm({
    feeBps: data.feeBps, duskDomainsOnChainClient, marketplaceContractId, newOrdersRefusal, onOpenWalletConnection, selectedAddress, selectedAuthority, selectedName, setError, writes,
  })
  const auctionState = useAuctions({
    refreshActivity: data.auctionPollingEnabled,
    accountScope, auctions, bidRefusal, indexerClient, marketplaceOnChainClient, marketScope, selectedAuctionNode, setSelectedAuctionNode, onBidPlaced: watch, selectedAuthority, setConfirmation, setError, writes,
  })
  const offerState = useOffers({
    duskDomainsOnChainClient, initialOfferName: opening.offerName, marketplaceContractId, marketplaceOnChainClient, newOrdersRefusal, ownedNames, selectedAddress, selectedAuthority, setError, writes,
  })

  const fixedSaleState = useFixedSales({ marketplaceOnChainClient, selectedAddress, selectedAuthority, setError, writes })

  const ownerAddresses = useMarketAddresses(indexerClient, [...auctions, ...fixedSales, ...data.offers].map(order => order.name), mainView === 'marketplace')

  const takeBackSubnames = async (name: IndexedNameSummary) => {
    if (!indexerClient || !duskDomainsOnChainClient) return
    try {
      await canonicalOwnedName(duskDomainsOnChainClient, name, selectedAuthority)
      const fresh = await indexerClient.getNameState(name.node)
      if (!fresh) throw new Error('Name data is still syncing.')
      const call = purchaseTakeBackCall({ ...name, ...fresh }, selectedAuthority)
      await writes.submit('taking back subnames', name.canonicalName, call, 'Subnames taken back. Their previous records and primary names were cleared.')
    } catch (error) { setError(userFacingErrorMessage(error)) }
  }

  const marketplaceProps: MarketplaceViewProps = {
      takeBackOffers: ownedNames.map(name => ({ name: name.canonicalName, count: sellerHeldSubnames(name, selectedAuthority).length, takeBack: () => void takeBackSubnames(name) })).filter(offer => offer.count > 0),
      wallet: {
        ownerAddresses,
        tradingPaused: args.tradingPaused,
        actionsAvailable,
        selectedAddress,
        selectedAuthority,
        onOpenWalletConnection,
      },
      feedback: {
        review: writes.review,
        onCancelReview: writes.cancelReview,
        onConfirmReview: writes.confirmReview,
        confirmation,
        error,
        txState,
      },
      listings: {
        auctions,
        fixedSales,
        onBuyFixedSale: fixedSaleState.buyFixedSale,
        onCancelFixedSale: fixedSaleState.cancelFixedSale,
        onExpireFixedSale: fixedSaleState.expireFixedSale,
      },
      auction: {
        auctionActivity: auctionState.auctionActivity,
        auctionActivityLoading: auctionState.auctionActivityLoading,
        auctionActivityHasMore: auctionState.hasMoreActivity,
        onLoadMoreAuctionActivity: auctionState.loadMoreActivity,
        bidDrafts: auctionState.bidDrafts,
        bidReview: auctionState.bidReview,
        selectedAuctionNode: auctionState.selectedAuctionNode,
        onBidDraftChange: auctionState.setBidDraft,
        onCancelBidReview: () => auctionState.setBidReview(null),
        onCancelAuction: auctionState.cancelAuction,
        onExpireAuction: auctionState.expireAuction,
        onOpenAuction: (node) => {
          setTab('browse')
          listingLink.clearListing()
          auctionState.openAuction(node)
        },
        onPlaceBid: auctionState.placeBid,
        onReviewBid: (auction) => void auctionState.reviewBid(auction),
        onSettleAuction: auctionState.settleAuction,
        onCloseAuction: auctionState.closeAuction,
        bidRefusal,
      },
      market: {
        hasData: data.hasData,
        readError: data.readError,
        onRetry: () => void data.loadMarketplace(),
        currentBlockHeight: data.currentBlockHeight,
        updatedAt: data.updatedAt,
        loading: data.loading,
        hasMore: data.hasMore,
        onLoadMore: () => void data.loadMore(),
        marketplaceEnabled,
      },
      selling: {
        durationDays: sell.durationDays,
        feeBps: data.feeBps,
        newOrdersRefusal,
        fixedPriceDusk: sell.fixedPriceDusk,
        privateBuyer: sell.privateBuyer,
        reserveDusk: sell.reserveDusk,
        saleMode: sell.saleMode,
        selectedNode,
        sellableNames,
        onCreateListing: sell.createListing,
        onDurationDaysChange: sell.setDurationDays,
        onFixedPriceDuskChange: sell.setFixedPriceDusk,
        onPrivateBuyerChange: sell.setPrivateBuyer,
        onReserveDuskChange: sell.setReserveDusk,
        onSaleModeChange: sell.setSaleMode,
        onSelectedNodeChange: node => { setSellName(sellableNames.find(name => name.node === node)?.canonicalName ?? ''); setSelectedNode(node) },
      },
      offers: {
        offerAmountDusk: offerState.offerAmountDusk,
        offerDurationDays: offerState.offerDurationDays,
        offerName: offerState.offerName,
        offers: data.offers,
        onAcceptOffer: offerState.acceptOffer,
        onCancelOffer: offerState.cancelOffer,
        onExpireOffer: offerState.expireOffer,
        onOfferAmountDuskChange: offerState.setOfferAmountDusk,
        onOfferDurationDaysChange: offerState.setOfferDurationDays,
        onOfferNameChange: offerState.setOfferName,
        onPlaceOffer: offerState.placeOffer,
      },
      withdrawal: {
        refunds,
        onClaimRefund: claimRefund,
        currentMarketplace: args.preferredMarketplace,
      },
      navigation: {
        tab,
        listingName: listingLink.listingName,
        listingKey: listingLink.listingKey,
        onBrowseQueryChange: listingLink.onBrowseQueryChange,
        onTabChange: (nextTab) => {
          setTab(nextTab)
          listingLink.clearListing()
          if (nextTab !== 'browse') auctionState.setSelectedAuctionNode('')
        },
      },
      watchlist: {
        watchedNodes,
        onToggleWatch: toggleWatch,
      },
    }

    return {
      loadMarketplace,
      marketplaceProps,
      sellName: tab === 'sell' ? sellName : '',
      openSell: (name: string) => { setSellName(name); setSelectedNode(''); setSelectedAuctionNode(''); setTab('sell') },
      offerName: tab === 'offers' ? offerName : '',
      openOffer: (name: string) => { setOfferName(name); offerState.setOfferName(name); setSelectedAuctionNode(''); setTab('offers') },
      listingName: tab === 'browse' && !auctionState.selectedAuctionNode ? listingLink.listingName : '',
      openListing: (name: string) => { listingLink.openListing(name); setSelectedAuctionNode(''); setTab('browse') },
    }
  }

export type MarketplaceFeature = ReturnType<typeof useMarketplaceFeature>
