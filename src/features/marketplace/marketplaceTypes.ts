import type {
  ActivityEntry,
  DuskDomainTxState,
  IndexedMarketplaceAuction,
  IndexedMarketplaceFixedSale,
  IndexedMarketplaceOffer,
  IndexedMarketplaceRefund,
  IndexedNameSummary,
  NamespaceSummary,
} from '../../names/internal'

export type MarketplaceTab = 'browse' | 'activity' | 'sell' | 'offers'
export type MarketplaceSaleMode = 'fixed' | 'auction'

export type MarketplaceBidReview = {
  amountDusk: string
  amountLux: bigint
  auction: IndexedMarketplaceAuction
  minimumBidLux: bigint
}

export type MarketplaceReviewDetails = {
  namespace?: NamespaceSummary
  transfersNamespace?: boolean
  title: string
  rows: Array<{ label: string; value: string; exactValue?: string; address?: boolean; detail?: string }>
  note: string
}

export type MarketplaceViewProps = {
  takeBackOffers?: Array<{ name: string; count: number; takeBack: () => void }>
  wallet: {
    ownerAddresses?: string[]
    tradingPaused?: boolean
    actionsAvailable: boolean
    selectedAddress: string
    selectedAuthority: string
    onOpenWalletConnection: () => void
  }
  feedback: {
    review?: MarketplaceReviewDetails | null
    onCancelReview?: () => void
    onConfirmReview?: () => void
    confirmation: string
    error: string
    txState: DuskDomainTxState | null
  }
  listings: {
    auctions: IndexedMarketplaceAuction[]
    fixedSales: IndexedMarketplaceFixedSale[]
    onBuyFixedSale: (sale: IndexedMarketplaceFixedSale) => void
    onCancelFixedSale: (sale: IndexedMarketplaceFixedSale) => void
    onExpireFixedSale: (sale: IndexedMarketplaceFixedSale) => void
  }
  auction: {
    auctionActivity: ActivityEntry[]
    auctionActivityLoading: boolean
    auctionActivityHasMore?: boolean
    onLoadMoreAuctionActivity?: () => void
    bidDrafts: Record<string, string>
    bidReview: MarketplaceBidReview | null
    selectedAuctionNode: string
    onBidDraftChange: (node: string, value: string) => void
    onCancelBidReview: () => void
    onCancelAuction: (auction: IndexedMarketplaceAuction) => void
    onExpireAuction: (auction: IndexedMarketplaceAuction) => void
    onOpenAuction: (node: string) => void
    onPlaceBid: (auction: IndexedMarketplaceAuction) => void
    onReviewBid: (auction: IndexedMarketplaceAuction) => void
    onSettleAuction: (auction: IndexedMarketplaceAuction) => void
    onCloseAuction: () => void
  }
  market: {
    updatedAt?: number | null
    currentBlockHeight: number | null
    hasMore?: boolean
    onLoadMore?: () => void
    loading: boolean
    marketplaceEnabled: boolean
  }
  selling: {
    durationDays: string
    feeBps?: number | null
    fixedPriceDusk: string
    privateBuyer: string
    reserveDusk: string
    saleMode: MarketplaceSaleMode
    selectedNode: string
    sellableNames: IndexedNameSummary[]
    onCreateListing: () => void
    onDurationDaysChange: (value: string) => void
    onFixedPriceDuskChange: (value: string) => void
    onPrivateBuyerChange: (value: string) => void
    onReserveDuskChange: (value: string) => void
    onSaleModeChange: (mode: MarketplaceSaleMode) => void
    onSelectedNodeChange: (node: string) => void
  }
  offers: {
    offerAmountDusk: string
    offerDurationDays: string
    offerName: string
    offers: IndexedMarketplaceOffer[]
    onAcceptOffer: (offer: IndexedMarketplaceOffer) => void
    onCancelOffer: (offer: IndexedMarketplaceOffer) => void
    onExpireOffer: (offer: IndexedMarketplaceOffer) => void
    onOfferAmountDuskChange: (value: string) => void
    onOfferDurationDaysChange: (value: string) => void
    onOfferNameChange: (value: string) => void
    onPlaceOffer: () => void
  }
  withdrawal: {
    refund: IndexedMarketplaceRefund | null
    onClaimRefund: () => void
  }
  navigation: {
    tab: MarketplaceTab
    onTabChange: (tab: MarketplaceTab) => void
  }
  watchlist: {
    watchedNodes: string[]
    onToggleWatch: (node: string) => void
  }
}

export type MarketplaceBrowseProps = {
  wallet: Pick<MarketplaceViewProps['wallet'], 'ownerAddresses' | 'actionsAvailable' | 'onOpenWalletConnection' | 'selectedAddress' | 'selectedAuthority' | 'tradingPaused'>
  listings: Pick<MarketplaceViewProps['listings'], 'auctions' | 'fixedSales' | 'onBuyFixedSale' | 'onCancelFixedSale' | 'onExpireFixedSale'>
  market: Pick<MarketplaceViewProps['market'], 'currentBlockHeight'>
  auction: Pick<MarketplaceViewProps['auction'], 'onOpenAuction'>
  navigation: Pick<MarketplaceViewProps['navigation'], 'onTabChange'>
  watchlist: Pick<MarketplaceViewProps['watchlist'], 'onToggleWatch' | 'watchedNodes'>
}

export type MarketplaceAuctionDetailProps = {
  feedback: Pick<MarketplaceViewProps['feedback'], 'error'>
  wallet: Pick<MarketplaceViewProps['wallet'], 'ownerAddresses' | 'actionsAvailable' | 'onOpenWalletConnection' | 'selectedAddress' | 'selectedAuthority' | 'tradingPaused'>
  market: Pick<MarketplaceViewProps['market'], 'updatedAt' | 'currentBlockHeight'>
  auction: Pick<MarketplaceViewProps['auction'], 'auctionActivity' | 'auctionActivityHasMore' | 'auctionActivityLoading' | 'bidDrafts' | 'onBidDraftChange' | 'onCancelAuction' | 'onCloseAuction' | 'onExpireAuction' | 'onLoadMoreAuctionActivity' | 'onReviewBid' | 'onSettleAuction'>
  watchlist: Pick<MarketplaceViewProps['watchlist'], 'onToggleWatch' | 'watchedNodes'>
}

export type MarketplaceOffersProps = {
  wallet: Pick<MarketplaceViewProps['wallet'], 'ownerAddresses' | 'actionsAvailable' | 'onOpenWalletConnection' | 'selectedAddress' | 'selectedAuthority' | 'tradingPaused'>
  market: Pick<MarketplaceViewProps['market'], 'currentBlockHeight'>
  offers: Pick<MarketplaceViewProps['offers'], 'offerAmountDusk' | 'offerDurationDays' | 'offerName' | 'offers' | 'onAcceptOffer' | 'onCancelOffer' | 'onExpireOffer' | 'onOfferAmountDuskChange' | 'onOfferDurationDaysChange' | 'onOfferNameChange' | 'onPlaceOffer'>
  selling: Pick<MarketplaceViewProps['selling'], 'sellableNames'>
}

export type MarketplaceSellProps = {
  wallet: Pick<MarketplaceViewProps['wallet'], 'actionsAvailable' | 'onOpenWalletConnection' | 'selectedAddress' | 'tradingPaused'>
  selling: Pick<MarketplaceViewProps['selling'], 'durationDays' | 'feeBps' | 'fixedPriceDusk' | 'onCreateListing' | 'onDurationDaysChange' | 'onFixedPriceDuskChange' | 'onPrivateBuyerChange' | 'onReserveDuskChange' | 'onSaleModeChange' | 'onSelectedNodeChange' | 'privateBuyer' | 'reserveDusk' | 'saleMode' | 'selectedNode' | 'sellableNames'>
}

export type MarketplaceActivityProps = {
  wallet: Pick<MarketplaceViewProps['wallet'], 'actionsAvailable' | 'onOpenWalletConnection' | 'selectedAddress' | 'selectedAuthority'>
  listings: Pick<MarketplaceViewProps['listings'], 'auctions' | 'fixedSales'>
  market: Pick<MarketplaceViewProps['market'], 'currentBlockHeight'>
  offers: Pick<MarketplaceViewProps['offers'], 'offers'>
  withdrawal: Pick<MarketplaceViewProps['withdrawal'], 'onClaimRefund' | 'refund'>
  auction: Pick<MarketplaceViewProps['auction'], 'onOpenAuction'>
  navigation: Pick<MarketplaceViewProps['navigation'], 'onTabChange'>
  watchlist: Pick<MarketplaceViewProps['watchlist'], 'watchedNodes'>
}

export type MarketplaceBidReviewProps = {
  wallet: Pick<MarketplaceViewProps['wallet'], 'actionsAvailable' | 'selectedAddress' | 'tradingPaused'>
  auction: Pick<MarketplaceViewProps['auction'], 'bidReview' | 'onCancelBidReview' | 'onPlaceBid'>
  market: Pick<MarketplaceViewProps['market'], 'currentBlockHeight'>
}
