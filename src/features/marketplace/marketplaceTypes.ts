import type {
  ActivityEntry,
  DuskDomainTxState,
  IndexedMarketplaceAuction,
  IndexedMarketplaceFixedSale,
  IndexedMarketplaceOffer,
  IndexedMarketplaceRefund,
  IndexedNameSummary,
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
  title: string
  rows: Array<{ label: string; value: string; exactValue?: string; address?: boolean; detail?: string }>
  note: string
}

export type MarketplaceViewProps = {
  takeBackOffers?: Array<{ name: string; count: number; takeBack: () => void }>
  ownerAddresses?: string[]
  review?: MarketplaceReviewDetails | null
  onCancelReview?: () => void
  onConfirmReview?: () => void
  tradingPaused?: boolean
  actionsAvailable: boolean
  auctions: IndexedMarketplaceAuction[]
  auctionActivity: ActivityEntry[]
  auctionActivityLoading: boolean
  auctionActivityHasMore?: boolean
  onLoadMoreAuctionActivity?: () => void
  bidDrafts: Record<string, string>
  bidReview: MarketplaceBidReview | null
  confirmation: string
  updatedAt?: number | null
  currentBlockHeight: number | null
  durationDays: string
  error: string
  feeBps?: number | null
  fixedPriceDusk: string
  fixedSales: IndexedMarketplaceFixedSale[]
  hasMore?: boolean
  onLoadMore?: () => void
  loading: boolean
  marketplaceEnabled: boolean
  offerAmountDusk: string
  offerDurationDays: string
  offerName: string
  offers: IndexedMarketplaceOffer[]
  privateBuyer: string
  refund: IndexedMarketplaceRefund | null
  reserveDusk: string
  saleMode: MarketplaceSaleMode
  selectedAddress: string
  selectedAuctionNode: string
  selectedAuthority: string
  selectedNode: string
  sellableNames: IndexedNameSummary[]
  tab: MarketplaceTab
  txState: DuskDomainTxState | null
  watchedNodes: string[]
  onAcceptOffer: (offer: IndexedMarketplaceOffer) => void
  onBidDraftChange: (node: string, value: string) => void
  onCancelBidReview: () => void
  onBuyFixedSale: (sale: IndexedMarketplaceFixedSale) => void
  onCancelAuction: (auction: IndexedMarketplaceAuction) => void
  onCancelFixedSale: (sale: IndexedMarketplaceFixedSale) => void
  onCancelOffer: (offer: IndexedMarketplaceOffer) => void
  onClaimRefund: () => void
  onCreateListing: () => void
  onDurationDaysChange: (value: string) => void
  onExpireAuction: (auction: IndexedMarketplaceAuction) => void
  onExpireFixedSale: (sale: IndexedMarketplaceFixedSale) => void
  onExpireOffer: (offer: IndexedMarketplaceOffer) => void
  onFixedPriceDuskChange: (value: string) => void
  onOfferAmountDuskChange: (value: string) => void
  onOfferDurationDaysChange: (value: string) => void
  onOfferNameChange: (value: string) => void
  onOpenWalletConnection: () => void
  onOpenAuction: (node: string) => void
  onPlaceBid: (auction: IndexedMarketplaceAuction) => void
  onPlaceOffer: () => void
  onPrivateBuyerChange: (value: string) => void
  onReviewBid: (auction: IndexedMarketplaceAuction) => void
  onReserveDuskChange: (value: string) => void
  onSaleModeChange: (mode: MarketplaceSaleMode) => void
  onSelectedNodeChange: (node: string) => void
  onSettleAuction: (auction: IndexedMarketplaceAuction) => void
  onTabChange: (tab: MarketplaceTab) => void
  onToggleWatch: (node: string) => void
  onCloseAuction: () => void
}

export type MarketplaceBrowseProps = Pick<MarketplaceViewProps,
  | 'ownerAddresses'
  | 'actionsAvailable'
  | 'auctions'
  | 'currentBlockHeight'
  | 'fixedSales'
  | 'onBuyFixedSale'
  | 'onCancelFixedSale'
  | 'onExpireFixedSale'
  | 'onOpenAuction'
  | 'onOpenWalletConnection'
  | 'onTabChange'
  | 'onToggleWatch'
  | 'selectedAddress'
  | 'selectedAuthority'
  | 'tradingPaused'
  | 'watchedNodes'
>

export type MarketplaceAuctionDetailProps = Pick<MarketplaceViewProps,
  | 'error'
  | 'ownerAddresses'
  | 'updatedAt'
  | 'actionsAvailable'
  | 'auctionActivity'
  | 'auctionActivityHasMore'
  | 'auctionActivityLoading'
  | 'bidDrafts'
  | 'currentBlockHeight'
  | 'onBidDraftChange'
  | 'onCancelAuction'
  | 'onCloseAuction'
  | 'onExpireAuction'
  | 'onLoadMoreAuctionActivity'
  | 'onOpenWalletConnection'
  | 'onReviewBid'
  | 'onSettleAuction'
  | 'onToggleWatch'
  | 'selectedAddress'
  | 'selectedAuthority'
  | 'tradingPaused'
  | 'watchedNodes'
>

export type MarketplaceOffersProps = Pick<MarketplaceViewProps,
  | 'ownerAddresses'
  | 'actionsAvailable'
  | 'currentBlockHeight'
  | 'offerAmountDusk'
  | 'offerDurationDays'
  | 'offerName'
  | 'offers'
  | 'onAcceptOffer'
  | 'onCancelOffer'
  | 'onExpireOffer'
  | 'onOfferAmountDuskChange'
  | 'onOfferDurationDaysChange'
  | 'onOfferNameChange'
  | 'onOpenWalletConnection'
  | 'onPlaceOffer'
  | 'selectedAddress'
  | 'selectedAuthority'
  | 'sellableNames'
  | 'tradingPaused'
>

export type MarketplaceSellProps = Pick<MarketplaceViewProps,
  | 'actionsAvailable'
  | 'durationDays'
  | 'feeBps'
  | 'fixedPriceDusk'
  | 'onCreateListing'
  | 'onDurationDaysChange'
  | 'onFixedPriceDuskChange'
  | 'onOpenWalletConnection'
  | 'onPrivateBuyerChange'
  | 'onReserveDuskChange'
  | 'onSaleModeChange'
  | 'onSelectedNodeChange'
  | 'privateBuyer'
  | 'reserveDusk'
  | 'saleMode'
  | 'selectedAddress'
  | 'selectedNode'
  | 'sellableNames'
  | 'tradingPaused'
>

export type MarketplaceActivityProps = Pick<MarketplaceViewProps,
  | 'actionsAvailable'
  | 'auctions'
  | 'currentBlockHeight'
  | 'fixedSales'
  | 'offers'
  | 'onClaimRefund'
  | 'onOpenAuction'
  | 'onOpenWalletConnection'
  | 'onTabChange'
  | 'refund'
  | 'selectedAddress'
  | 'selectedAuthority'
  | 'watchedNodes'
>

export type MarketplaceBidReviewProps = Pick<MarketplaceViewProps,
  | 'actionsAvailable'
  | 'bidReview'
  | 'currentBlockHeight'
  | 'onCancelBidReview'
  | 'onPlaceBid'
  | 'selectedAddress'
  | 'tradingPaused'
>
