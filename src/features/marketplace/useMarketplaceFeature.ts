import { useCallback, useMemo, useState } from 'react'
import type { SubmitNameWrite } from '../../app/useDuskDomainWriter'
import type { LiveWritePreflight } from '../../app/useLiveWritePreflight'
import {
  isDuskDomainTxBusy,
  marketplaceBuyFixedSaleRuntimeCall,
  marketplaceCancelFixedSaleRuntimeCall,
  marketplaceClaimRefundRuntimeCall,
  marketplaceExpireFixedSaleRuntimeCall,
  userFacingErrorMessage,
  type DuskDomainsIndexerClient,
  type DuskDomainsMarketplaceOnChainClient,
  type DuskDomainsOnChainClient,
  type DuskDomainsRuntimeConfig,
  type DuskDomainTxState,
  type IndexedMarketplaceFixedSale,
} from '../../names/internal'
import { useScopedState } from '../../utils/useScopedState'
import { canonicalFixedSale, canonicalRefund } from './canonicalMarketplaceState'
import type { MarketplaceTab, MarketplaceViewProps } from './marketplaceTypes'
import { useAuctions } from './useAuctions'
import { useMarketplaceData, type MarketplaceSnapshot } from './useMarketplaceData'
import { useMarketplaceWrites } from './useMarketplaceWrites'
import { useOffers } from './useOffers'
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
  const [selectedNode, setSelectedNode] = useScopedState(accountScope, '')
  // Auction selection belongs to the market, so wallet restoration keeps the detail open.
  const [selectedAuctionNode, setSelectedAuctionNode] = useScopedState(marketScope, '')

  // Feedback belongs to the tab it came from.
  const feedbackScope = `${accountScope}:${mainView}:${tab}`
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

  // After each load, keep the chosen name to sell if it is still sellable.
  const onLoaded = ({ auctions, fixedSales, ownedNames }: MarketplaceSnapshot) => {
    setSelectedNode((current) => {
      if (current && ownedNames.some((name) => name.node === current)) return current
      return ownedNames.find((name) => !fixedSales.some((sale) => sale.node === name.node)
        && !auctions.some((auction) => auction.node === name.node))?.node ?? ''
    })
  }
  const data = useMarketplaceData({ accountScope, indexerClient, mainView, onLoaded, selectedAddress, selectedAuctionNode, selectedAuthority, setError })
  const { auctions, fixedSales, loadMarketplace, ownedNames, refund } = data

  const writes = useMarketplaceWrites({
    ...args,
    actionsAvailable,
    feedback: { setConfirmation, setError, setTxState },
    loadMarketplace,
  })

  const activeOrderNodes = useMemo(() => new Set([
    ...fixedSales.map((sale) => sale.node),
    ...auctions.map((auction) => auction.node),
  ]), [auctions, fixedSales])
  const sellableNames = useMemo(() => ownedNames.filter((name) => (
    name.status === 'active' && name.owner === selectedAuthority
      && name.subnameCount === 0 && name.canonicalName.split('.').length === 2 && !activeOrderNodes.has(name.node)
  )), [activeOrderNodes, ownedNames, selectedAuthority])
  const selectedName = useMemo(() => (
    sellableNames.find((name) => name.node === selectedNode) ?? sellableNames[0] ?? null
  ), [sellableNames, selectedNode])

  const sell = useSellForm({
    duskDomainsOnChainClient, marketplaceContractId, onOpenWalletConnection, selectedAddress, selectedAuthority, selectedName, setError, writes,
  })
  const auctionState = useAuctions({
    accountScope, auctions, indexerClient, loadMarketplace, marketplaceOnChainClient, marketScope, selectedAuctionNode, setSelectedAuctionNode, onBidPlaced: watch, selectedAuthority, setConfirmation, setError, writes,
  })
  const offerState = useOffers({
    duskDomainsOnChainClient, marketplaceContractId, marketplaceOnChainClient, ownedNames, selectedAddress, selectedAuthority, setError, writes,
  })

  const buyFixedSale = useCallback(async (sale: IndexedMarketplaceFixedSale) => {
    if (!marketplaceOnChainClient) return
    let canonical
    try {
      canonical = await canonicalFixedSale(marketplaceOnChainClient, sale)
    } catch (readError) {
      setError(userFacingErrorMessage(readError))
      return
    }
    await writes.submit(
      'buying this domain',
      sale.name,
      marketplaceBuyFixedSaleRuntimeCall({
        node: sale.node,
        priceLux: Number(canonical.priceLux),
        buyerManager: selectedAuthority || null,
      }),
      canonical.priceLux,
      `${sale.name} purchased.`,
    )
  }, [marketplaceOnChainClient, selectedAuthority, setError, writes])

  const fixedSaleAction = useCallback(async (
    sale: IndexedMarketplaceFixedSale,
    kind: 'cancel' | 'expire',
  ) => {
    if (!await writes.guardCanonicalRead((client) => canonicalFixedSale(client, sale))) return
    if (kind === 'cancel') {
      await writes.submit('cancelling this sale', sale.name, marketplaceCancelFixedSaleRuntimeCall({ node: sale.node }), 0n, 'Sale canceled.')
    } else {
      await writes.submit('closing this expired sale', sale.name, marketplaceExpireFixedSaleRuntimeCall({ node: sale.node }), 0n, 'Sale closed.')
    }
  }, [writes])

  const claimRefund = useCallback(async () => {
    if (!marketplaceOnChainClient || !refund) return
    try {
      await canonicalRefund(marketplaceOnChainClient, refund)
    } catch (readError) {
      setError(userFacingErrorMessage(readError))
      return
    }
    await writes.submit('claiming marketplace funds', 'Marketplace refund', marketplaceClaimRefundRuntimeCall(), 0n, 'Refund claimed.')
  }, [marketplaceOnChainClient, refund, setError, writes])

  const marketplaceProps: MarketplaceViewProps = {
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
    onBuyFixedSale: buyFixedSale,
    onCancelAuction: auctionState.cancelAuction,
    onCancelFixedSale: (sale) => fixedSaleAction(sale, 'cancel'),
    onCancelOffer: offerState.cancelOffer,
    onClaimRefund: claimRefund,
    onCreateListing: sell.createListing,
    onDurationDaysChange: sell.setDurationDays,
    onExpireAuction: auctionState.expireAuction,
    onExpireFixedSale: (sale) => fixedSaleAction(sale, 'expire'),
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
