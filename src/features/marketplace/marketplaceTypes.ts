import type {
  DuskDomainTxState,
  IndexedMarketplaceAuction,
  IndexedMarketplaceFixedSale,
  IndexedMarketplaceOffer,
  IndexedMarketplaceRefund,
  IndexedNameSummary,
} from '../../names/internal'

export type MarketplaceTab = 'browse' | 'sell' | 'offers'
export type MarketplaceSaleMode = 'fixed' | 'auction'

export type MarketplaceViewProps = {
  actionsAvailable: boolean
  auctions: IndexedMarketplaceAuction[]
  bidDrafts: Record<string, string>
  confirmation: string
  currentBlockHeight: number | null
  durationDays: string
  error: string
  fixedPriceDusk: string
  fixedSales: IndexedMarketplaceFixedSale[]
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
  selectedAuthority: string
  selectedNode: string
  sellableNames: IndexedNameSummary[]
  tab: MarketplaceTab
  txState: DuskDomainTxState | null
  onAcceptOffer: (offer: IndexedMarketplaceOffer) => void
  onBidDraftChange: (node: string, value: string) => void
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
  onPlaceBid: (auction: IndexedMarketplaceAuction) => void
  onPlaceOffer: () => void
  onPrivateBuyerChange: (value: string) => void
  onRefresh: () => void
  onReserveDuskChange: (value: string) => void
  onSaleModeChange: (mode: MarketplaceSaleMode) => void
  onSelectedNodeChange: (node: string) => void
  onSettleAuction: (auction: IndexedMarketplaceAuction) => void
  onTabChange: (tab: MarketplaceTab) => void
}
