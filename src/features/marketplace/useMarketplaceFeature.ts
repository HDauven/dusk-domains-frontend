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

type UseMarketplaceFeatureArgs = {
  tradingPaused: boolean
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

/** The market a route opens: a sell link's Sell tab, or a linked auction. */
export function marketOpening(route?: AppRoute): { tab: MarketplaceTab, sellName: string, auctionNode: string } {
  const market = route?.view === 'marketplace' ? route : null
  return { tab: market?.sellName ? 'sell' : 'browse', sellName: market?.sellName ?? '', auctionNode: market?.auctionNode ?? '' }
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

  const { sellableNames, selectedName, selectedNode, setSelectedNode } = useSellInventory({ accountScope, ownedNames, auctions, fixedSales, selectedAuthority, requestedName: sellName })
  const claimRefund = useMarketplaceRefund(refund, writes)

  const sell = useSellForm({
    feeBps: data.feeBps, duskDomainsOnChainClient, marketplaceContractId, onOpenWalletConnection, selectedAddress, selectedAuthority, selectedName, setError, writes,
  })
  const auctionState = useAuctions({
    accountScope, auctions, indexerClient, marketplaceOnChainClient, marketScope, selectedAuctionNode, setSelectedAuctionNode, onBidPlaced: watch, selectedAuthority, setConfirmation, setError, writes,
  })
  const offerState = useOffers({
    duskDomainsOnChainClient, marketplaceContractId, marketplaceOnChainClient, ownedNames, selectedAddress, selectedAuthority, setError, writes,
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
          auctionState.openAuction(node)
        },
        onPlaceBid: auctionState.placeBid,
        onReviewBid: (auction) => void auctionState.reviewBid(auction),
        onSettleAuction: auctionState.settleAuction,
        onCloseAuction: auctionState.closeAuction,
      },
      market: {
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
        refund,
        onClaimRefund: claimRefund,
      },
      navigation: {
        tab,
        onTabChange: (nextTab) => {
          setTab(nextTab)
          if (nextTab !== 'browse') auctionState.setSelectedAuctionNode('')
        },
      },
      watchlist: {
        watchedNodes,
        onToggleWatch: toggleWatch,
      },
    }

    return { loadMarketplace, marketplaceProps, sellName: tab === 'sell' ? sellName : '', openSell: (name: string) => { setSellName(name); setSelectedNode(''); setSelectedAuctionNode(''); setTab('sell') } }
  }

export type MarketplaceFeature = ReturnType<typeof useMarketplaceFeature>
