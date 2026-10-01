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
  it('offers more marketplace results and auction activity only when cursors remain', () => {
    expect(render({ hasMore: true })).toContain('Load more marketplace results')
    expect(render({ hasMore: false })).not.toContain('Load more marketplace results')
    const selected = auction()
    expect(render({ auctions: [selected], selectedAuctionNode: selected.node, auctionActivityHasMore: true })).toContain('Load more auction activity')
  })

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

  it('shows reserve and duration before opening a waiting auction', () => {
    const html = render({ auctions: [auction()] })

    expect(html).toContain('Waiting for first bid')
    expect(html).toContain('7 days')
    expect(html).toContain('Reserve')
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

it('disables only new trades while paused and keeps custody release and refunds enabled', () => {
  const paused = { tradingPaused: true }
  const button = (html: string, label: string) => {
    const match = html.match(new RegExp(`<button[^>]*>${label}</button>`))
    expect(match, label).not.toBeNull()
    return match![0]
  }
  expect(button(render({ ...paused, fixedSales: [fixedSale()] }), 'Buy for 25 DUSK')).toContain('disabled')
  expect(button(render({ ...paused, fixedSales: [fixedSale()], selectedAuthority: seller }), 'Cancel listing')).not.toContain('disabled')
  expect(button(render({ ...paused, fixedSales: [fixedSale({ expiresAtBlockHeight: 1000 })] }), 'Close listing')).not.toContain('disabled')
  for (const saleMode of ['fixed', 'auction'] as const) {
    expect(button(render({ ...paused, tab: 'sell', sellableNames: [ownedName()], selectedAuthority: seller, saleMode }), saleMode === 'fixed' ? 'List for sale' : 'Start auction')).toContain('disabled')
  }
  expect(button(render({ ...paused, tab: 'offers', offers: [offer()], sellableNames: [ownedName()], selectedAuthority: seller }), 'Accept')).toContain('disabled')
  expect(button(render({ ...paused, tab: 'offers', offers: [offer()] }), 'Cancel')).not.toContain('disabled')
  expect(button(render({ ...paused, tab: 'offers', offers: [offer({ expiresAtBlockHeight: 1000 })] }), 'Close')).not.toContain('disabled')
  expect(button(render({ ...paused, tab: 'offers' }), 'Place offer')).toContain('disabled')
  const dormant = auction()
  expect(button(render({ ...paused, auctions: [dormant], selectedAuctionNode: dormant.node }), 'Review bid')).toContain('disabled')
  expect(button(render({ ...paused, auctions: [dormant], selectedAuctionNode: dormant.node, selectedAuthority: seller }), 'Cancel auction')).not.toContain('disabled')
  const ended = auction({ startBlockHeight: 800, endBlockHeight: 1000, highestBid: { bidderAuthority: buyer, amountLux: 40_000_000_000, placedAtBlockHeight: 800 }, bidCount: 1 })
  expect(button(render({ ...paused, auctions: [ended], selectedAuctionNode: ended.node }), 'Finalize auction')).not.toContain('disabled')
  expect(button(render({ ...paused, tab: 'activity', refund: { authority: buyer, recipient: null, amountLux: 20_000_000_000, txId: 'refund', blockHeight: 1000, lastEventType: 'domain_offer_closed' } }), 'Withdraw to wallet')).not.toContain('disabled')
  expect(button(render({ ...paused, bidReview: { amountDusk: '40', amountLux: 40_000_000_000n, minimumBidLux: 40_000_000_000n, auction: dormant } }), 'Confirm in wallet')).toContain('disabled')
})

it('shows one minimum price before the first bid and labels the seller as You', () => {
  const html = render({ auctions: [auction()], selectedAuthority: seller })
  expect(html).not.toContain('>Minimum bid</dt>')
  expect(html).toContain('>Reserve</dt>')
  expect(html).toContain('Your auction')
})
it('sorts fixed listings and auctions together by ending time', () => {
  const html = render({ auctions: [auction({ name: 'later.dusk', startDeadlineBlockHeight: 4000 })], fixedSales: [fixedSale({ name: 'sooner.dusk' })] })
  expect(html.indexOf('sooner<span>')).toBeLessThan(html.indexOf('later<span>'))
})
it('gives quiet marketplace states a next action without zero stat tiles', () => {
  expect(render()).toContain('Browse names')
  const yours = render({ tab: 'activity' })
  expect(yours).toContain('Browse listings')
  expect(yours).not.toContain('Your marketplace summary')
})

it('lets visitors browse offers without giving them buyer or seller actions', () => {
  const html = render({ tab: 'offers', offers: [offer()], selectedAuthority: outsider })
  expect(html).toContain('aurora.dusk')
  expect(html).toContain('Filter offers')
  expect(html).toContain('Sort offers')
  expect(html).not.toContain('>Cancel</button>')
  expect(html).not.toContain('>Accept</button>')
})

it('keeps browse cards to status, name, amount, time and action', () => {
  const live = auction({ startBlockHeight: 900, endBlockHeight: 2000, highestBid: { amountLux: 36_465_187_500, bidderAuthority: buyer, placedAtBlockHeight: 900 } })
  const html = render({ auctions: [live], fixedSales: [fixedSale()] })
  expect(html).toContain('36.47 DUSK')
  expect(html).toContain('title="36.4651875 DUSK"')
  for (const detail of ['Minimum next bid', '>Seller</dt>', 'last 10 minutes', 'Secured in escrow', 'Available to anyone']) expect(html).not.toContain(detail)
})
