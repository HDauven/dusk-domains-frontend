import { useState } from 'react'
import type { SubmitNameWrite } from '../../app/useDuskDomainWriter'
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

type UseMarketplaceFeatureArgs = {
  tradingPaused: boolean
  ensurePublicBalanceForLiveWrite: LiveWritePreflight['ensurePublicBalanceForLiveWrite']
  indexerClient: DuskDomainsIndexerClient | null
  duskDomainsOnChainClient: DuskDomainsOnChainClient | null
  liveWritesAvailable: boolean
  marketplaceOnChainClient: DuskDomainsMarketplaceOnChainClient | null
  mainView: string
  onOpenWalletConnection: () => void
  runtimeConfig: DuskDomainsRuntimeConfig
  selectedAddress: string
  selectedAuthority: string
  submitNameWrite: SubmitNameWrite
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
  const [tab, setTab] = useState<MarketplaceTab>('browse')
  // Auction selection belongs to the market, so wallet restoration keeps the detail open.
  const [selectedAuctionNode, setSelectedAuctionNode] = useScopedState(marketScope, '')

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
  const marketplaceContractId = runtimeConfig.contracts.marketplace?.contractId ?? ''

  const data = useMarketplaceData({ accountScope, indexerClient, mainView, onLoaded: () => setError(marketplaceErrorAfterRefresh), selectedAddress, selectedAuctionNode, selectedAuthority, setError })
  const { auctions, fixedSales, loadMarketplace, ownedNames, refund } = data

  const writes = useMarketplaceWrites({
    ...args,
    actionsAvailable,
    feedbackScope: tab === 'sell' ? `${feedbackScope}:${data.feeBps}` : feedbackScope,
    feedback: { setConfirmation, setError, setTxState },
    loadMarketplace,
  })

  const { sellableNames, selectedName, selectedNode, setSelectedNode } = useSellInventory({ accountScope, ownedNames, auctions, fixedSales, selectedAuthority })
  const claimRefund = useMarketplaceRefund(refund, writes)

  const sell = useSellForm({
    feeBps: data.feeBps, duskDomainsOnChainClient, marketplaceContractId, onOpenWalletConnection, selectedAddress, selectedAuthority, selectedName, setError, writes,
  })
  const auctionState = useAuctions({
    accountScope, auctions, indexerClient, loadMarketplace, marketplaceOnChainClient, marketScope, selectedAuctionNode, setSelectedAuctionNode, onBidPlaced: watch, selectedAuthority, setConfirmation, setError, writes,
  })
  const offerState = useOffers({
    duskDomainsOnChainClient, marketplaceContractId, marketplaceOnChainClient, ownedNames, selectedAddress, selectedAuthority, setError, writes,
  })

  const fixedSaleState = useFixedSales({ marketplaceOnChainClient, selectedAddress, selectedAuthority, setError, writes })

  const marketplaceProps: MarketplaceViewProps = {
    review: writes.review,
    onCancelReview: writes.cancelReview,
    onConfirmReview: writes.confirmReview,
    tradingPaused: args.tradingPaused,
    actionsAvailable,
    auctions,
    auctionActivity: auctionState.auctionActivity,
    auctionActivityLoading: auctionState.auctionActivityLoading,
    auctionActivityHasMore: auctionState.hasMoreActivity,
    onLoadMoreAuctionActivity: auctionState.loadMoreActivity,
    bidDrafts: auctionState.bidDrafts,
    bidReview: auctionState.bidReview,
    confirmation,
    currentBlockHeight: data.currentBlockHeight,
    updatedAt: data.updatedAt,
    durationDays: sell.durationDays,
    error,
    feeBps: data.feeBps,
    fixedPriceDusk: sell.fixedPriceDusk,
    fixedSales,
    loading: data.loading,
    hasMore: data.hasMore,
    onLoadMore: () => void data.loadMore(),
    marketplaceEnabled,
    offerAmountDusk: offerState.offerAmountDusk,
    offerDurationDays: offerState.offerDurationDays,
    offerName: offerState.offerName,
    offers: data.offers,
    privateBuyer: sell.privateBuyer,
    refund,
    reserveDusk: sell.reserveDusk,
    saleMode: sell.saleMode,
    selectedAddress,
    selectedAuctionNode: auctionState.selectedAuctionNode,
    selectedAuthority,
    selectedNode,
    sellableNames,
    tab,
    txState,
    watchedNodes,
    onAcceptOffer: offerState.acceptOffer,
    onBidDraftChange: auctionState.setBidDraft,
    onCancelBidReview: () => auctionState.setBidReview(null),
    onBuyFixedSale: fixedSaleState.buyFixedSale,
    onCancelAuction: auctionState.cancelAuction,
    onCancelFixedSale: fixedSaleState.cancelFixedSale,
    onCancelOffer: offerState.cancelOffer,
    onClaimRefund: claimRefund,
    onCreateListing: sell.createListing,
    onDurationDaysChange: sell.setDurationDays,
    onExpireAuction: auctionState.expireAuction,
    onExpireFixedSale: fixedSaleState.expireFixedSale,
    onExpireOffer: offerState.expireOffer,
    onFixedPriceDuskChange: sell.setFixedPriceDusk,
    onOfferAmountDuskChange: offerState.setOfferAmountDusk,
    onOfferDurationDaysChange: offerState.setOfferDurationDays,
    onOfferNameChange: offerState.setOfferName,
    onOpenWalletConnection,
    onOpenAuction: (node) => {
      setTab('browse')
      auctionState.openAuction(node)
    },
    onPlaceBid: auctionState.placeBid,
    onPlaceOffer: offerState.placeOffer,
    onPrivateBuyerChange: sell.setPrivateBuyer,
    onRefresh: loadMarketplace,
    onReviewBid: (auction) => void auctionState.reviewBid(auction),
    onReserveDuskChange: sell.setReserveDusk,
    onSaleModeChange: sell.setSaleMode,
    onSelectedNodeChange: setSelectedNode,
    onSettleAuction: auctionState.settleAuction,
    onTabChange: (nextTab) => {
      setTab(nextTab)
      if (nextTab !== 'browse') auctionState.setSelectedAuctionNode('')
    },
    onToggleWatch: toggleWatch,
    onCloseAuction: auctionState.closeAuction,
  }

  return { loadMarketplace, marketplaceProps }
}

export type MarketplaceFeature = ReturnType<typeof useMarketplaceFeature>
