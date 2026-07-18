import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type {
  IndexedMarketplaceAuction,
  IndexedMarketplaceFixedSale,
  IndexedMarketplaceOffer,
  IndexedNameSummary,
} from '../../names/internal'
import { MarketplaceView } from './MarketplaceView'
import type { MarketplaceViewProps } from './marketplaceTypes'

const seller = `0x${'22'.repeat(32)}`
const buyer = `0x${'33'.repeat(32)}`
const outsider = `0x${'44'.repeat(32)}`

describe('MarketplaceView actions', () => {
  it('asks a disconnected visitor to connect before buying', () => {
    const html = render({
      fixedSales: [fixedSale()],
      selectedAddress: '',
      selectedAuthority: '',
    })

    expect(html).toContain('Connect to buy')
    expect(html).not.toContain('>Buy</button>')
  })

  it('allows an eligible buyer and blocks a private-sale outsider', () => {
    const publicHtml = render({ fixedSales: [fixedSale()] })
    const privateHtml = render({
      fixedSales: [fixedSale({ privateBuyer: buyer })],
      selectedAuthority: outsider,
    })

    expect(publicHtml).toContain('>Buy for 25 DUSK</button>')
    expect(privateHtml).toMatch(/<button[^>]*disabled=""[^>]*>Private sale<\/button>/)
  })

  it('lets a seller cancel only before an auction receives a bid', () => {
    const dormant = auction()
    const dormantHtml = render({
      auctions: [dormant],
      selectedAuctionNode: dormant.node,
      selectedAuthority: seller,
    })
    const live = auction({
      startBlockHeight: 1_100,
      endBlockHeight: 2_000,
      highestBid: {
        bidderAuthority: buyer,
        amountLux: 50_000_000_000,
        placedAtBlockHeight: 1_100,
      },
      bidCount: 1,
    })
    const liveHtml = render({
      auctions: [live],
      selectedAuctionNode: live.node,
      selectedAuthority: seller,
    })

    expect(dormantHtml).toContain('>Cancel auction</button>')
    expect(liveHtml).toContain('Your domain remains in escrow')
    expect(liveHtml).not.toContain('>Cancel auction</button>')
  })

  it('exposes permissionless settlement only after an auction ends', () => {
    const endedAuction = auction({
      startBlockHeight: 900,
      endBlockHeight: 1_000,
      highestBid: {
        bidderAuthority: buyer,
        amountLux: 50_000_000_000,
        placedAtBlockHeight: 900,
      },
      bidCount: 1,
    })
    const html = render({
      auctions: [endedAuction],
      currentBlockHeight: 1_000,
      selectedAuctionNode: endedAuction.node,
      selectedAuthority: outsider,
    })

    expect(html).toContain('>Finalize auction</button>')
    expect(html).not.toContain('>Review bid</button>')
  })

  it('calls an ended leading bid a win while settlement is pending', () => {
    const endedAuction = auction({
      startBlockHeight: 900,
      endBlockHeight: 1_000,
      highestBid: {
        bidderAuthority: buyer,
        amountLux: 50_000_000_000,
        placedAtBlockHeight: 900,
      },
      bidCount: 1,
    })
    const detailHtml = render({
      auctions: [endedAuction],
      currentBlockHeight: 1_000,
      selectedAuctionNode: endedAuction.node,
      selectedAuthority: buyer,
    })
    const activityHtml = render({
      auctions: [endedAuction],
      currentBlockHeight: 1_000,
      selectedAuthority: buyer,
      tab: 'activity',
    })

    expect(detailHtml).toContain('You won — finalizing')
    expect(activityHtml).toContain('Won — finalizing')
    expect(activityHtml).toContain('Auction ended')
  })

  it('explains reserve-auction timing and minimum bids before opening the detail view', () => {
    const html = render({ auctions: [auction()] })

    expect(html).toContain('Waiting for first bid')
    expect(html).toContain('7 days once the first bid is confirmed')
    expect(html).toContain('Minimum bid')
    expect(html).toContain('View auction')
  })

  it('shows personal leading state and a custody-aware bid review', () => {
    const live = auction({
      startBlockHeight: 1_100,
      endBlockHeight: 2_000,
      highestBid: {
        bidderAuthority: buyer,
        amountLux: 50_000_000_000,
        placedAtBlockHeight: 1_100,
      },
      bidCount: 1,
    })
    const html = render({
      auctions: [live],
      bidReview: {
        amountDusk: '52.5',
        amountLux: 52_500_000_000n,
        auction: live,
        minimumBidLux: 52_500_000_000n,
      },
      selectedAuctionNode: live.node,
      selectedAuthority: buyer,
    })

    expect(html).toContain('You’re the highest bidder')
    expect(html).toContain('Review transaction')
    expect(html).toContain('Funds move into marketplace escrow')
    expect(html).toContain('Confirm in wallet')
  })

  it('shows accept, cancel and expiry actions for the right offer state', () => {
    const incomingHtml = render({
      tab: 'offers',
      offers: [offer()],
      sellableNames: [ownedName()],
      selectedAuthority: seller,
    })
    const outgoingHtml = render({
      tab: 'offers',
      offers: [offer()],
      selectedAuthority: buyer,
    })
    const expiredHtml = render({
      tab: 'offers',
      currentBlockHeight: 2_000,
      offers: [offer({ expiresAtBlockHeight: 1_900 })],
      selectedAuthority: buyer,
    })

    expect(incomingHtml).toContain('>Accept</button>')
    expect(outgoingHtml).toContain('>Cancel</button>')
    expect(expiredHtml).toContain('>Close</button>')
  })
})

function render(overrides: Partial<MarketplaceViewProps> = {}) {
  return renderToStaticMarkup(<MarketplaceView {...props(overrides)} />)
}

function props(overrides: Partial<MarketplaceViewProps>): MarketplaceViewProps {
  const noop = vi.fn()
  return {
    actionsAvailable: true,
    auctions: [],
    auctionActivity: [],
    auctionActivityLoading: false,
    bidDrafts: {},
    bidReview: null,
    confirmation: '',
    currentBlockHeight: 1_200,
    durationDays: '7',
    error: '',
    fixedPriceDusk: '25',
    fixedSales: [],
    loading: false,
    marketplaceEnabled: true,
    offerAmountDusk: '20',
    offerDurationDays: '7',
    offerName: '',
    offers: [],
    privateBuyer: '',
    refund: null,
    reserveDusk: '40',
    saleMode: 'fixed',
    selectedAddress: 'dusk1buyer',
    selectedAuctionNode: '',
    selectedAuthority: buyer,
    selectedNode: '',
    sellableNames: [],
    tab: 'browse',
    txState: null,
    watchedNodes: [],
    onAcceptOffer: noop,
    onBidDraftChange: noop,
    onCancelBidReview: noop,
    onBuyFixedSale: noop,
    onCancelAuction: noop,
    onCancelFixedSale: noop,
    onCancelOffer: noop,
    onClaimRefund: noop,
    onCreateListing: noop,
    onDurationDaysChange: noop,
    onExpireAuction: noop,
    onExpireFixedSale: noop,
    onExpireOffer: noop,
    onFixedPriceDuskChange: noop,
    onOfferAmountDuskChange: noop,
    onOfferDurationDaysChange: noop,
    onOfferNameChange: noop,
    onOpenWalletConnection: noop,
    onOpenAuction: noop,
    onPlaceBid: noop,
    onPlaceOffer: noop,
    onPrivateBuyerChange: noop,
    onRefresh: noop,
    onReviewBid: noop,
    onReserveDuskChange: noop,
    onSaleModeChange: noop,
    onSelectedNodeChange: noop,
    onSettleAuction: noop,
    onTabChange: noop,
    onToggleWatch: noop,
    onCloseAuction: noop,
    ...overrides,
  }
}

function fixedSale(overrides: Partial<IndexedMarketplaceFixedSale> = {}): IndexedMarketplaceFixedSale {
  return {
    node: `0x${'11'.repeat(32)}`,
    name: 'aurora.dusk',
    sellerAuthority: seller,
    priceLux: 25_000_000_000,
    privateBuyer: null,
    feeBps: 250,
    expiresAtBlockHeight: 2_000,
    openedAtBlockHeight: 1_000,
    marketplaceContractId: `0x${'55'.repeat(32)}`,
    escrowed: true,
    txId: 'tx-sale',
    blockHeight: 1_000,
    lastEventType: 'domain_fixed_sale_opened',
    ...overrides,
  }
}

function auction(overrides: Partial<IndexedMarketplaceAuction> = {}): IndexedMarketplaceAuction {
  return {
    node: `0x${'11'.repeat(32)}`,
    name: 'aurora.dusk',
    sellerAuthority: seller,
    reservePriceLux: 40_000_000_000,
    durationBlocks: 60_480,
    startDeadlineBlockHeight: 2_000,
    feeBps: 250,
    startBlockHeight: null,
    endBlockHeight: null,
    highestBid: null,
    bidCount: 0,
    createdAtBlockHeight: 1_000,
    marketplaceContractId: `0x${'55'.repeat(32)}`,
    escrowed: true,
    txId: 'tx-auction',
    blockHeight: 1_000,
    lastEventType: 'domain_auction_created',
    ...overrides,
  }
}

function offer(overrides: Partial<IndexedMarketplaceOffer> = {}): IndexedMarketplaceOffer {
  return {
    node: `0x${'11'.repeat(32)}`,
    name: 'aurora.dusk',
    buyerAuthority: buyer,
    amountLux: 20_000_000_000,
    feeBps: 250,
    expiresAtBlockHeight: 2_000,
    placedAtBlockHeight: 1_000,
    txId: 'tx-offer',
    blockHeight: 1_000,
    lastEventType: 'domain_offer_placed',
    ...overrides,
  }
}

function ownedName(): IndexedNameSummary {
  return {
    node: `0x${'11'.repeat(32)}`,
    canonicalName: 'aurora.dusk',
    owner: seller,
    manager: seller,
    resolverId: null,
    expiresAt: null,
    graceEndsAt: null,
    status: 'active',
    lastEventType: 'name_registered',
    records: [],
    subnameCount: 0,
    activityCount: 0,
  }
}
