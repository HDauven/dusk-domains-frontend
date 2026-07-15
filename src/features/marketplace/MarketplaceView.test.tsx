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

    expect(publicHtml).toContain('>Buy</button>')
    expect(privateHtml).toMatch(/<button[^>]*disabled=""[^>]*>Private sale<\/button>/)
  })

  it('lets a seller cancel only before an auction receives a bid', () => {
    const dormantHtml = render({
      auctions: [auction()],
      selectedAuthority: seller,
    })
    const liveHtml = render({
      auctions: [auction({
        startBlockHeight: 1_100,
        endBlockHeight: 2_000,
        highestBid: {
          bidderAuthority: buyer,
          amountLux: 50_000_000_000,
          placedAtBlockHeight: 1_100,
        },
        bidCount: 1,
      })],
      selectedAuthority: seller,
    })

    expect(dormantHtml).toContain('>Cancel</button>')
    expect(liveHtml).toContain('Auction live')
    expect(liveHtml).not.toContain('>Cancel</button>')
  })

  it('exposes permissionless settlement only after an auction ends', () => {
    const html = render({
      auctions: [auction({
        startBlockHeight: 900,
        endBlockHeight: 1_000,
        highestBid: {
          bidderAuthority: buyer,
          amountLux: 50_000_000_000,
          placedAtBlockHeight: 900,
        },
        bidCount: 1,
      })],
      currentBlockHeight: 1_000,
      selectedAuthority: outsider,
    })

    expect(html).toContain('>Settle</button>')
    expect(html).not.toContain('>Bid</button>')
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
    bidDrafts: {},
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
    selectedAuthority: buyer,
    selectedNode: '',
    sellableNames: [],
    tab: 'browse',
    txState: null,
    onAcceptOffer: noop,
    onBidDraftChange: noop,
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
    onPlaceBid: noop,
    onPlaceOffer: noop,
    onPrivateBuyerChange: noop,
    onRefresh: noop,
    onReserveDuskChange: noop,
    onSaleModeChange: noop,
    onSelectedNodeChange: noop,
    onSettleAuction: noop,
    onTabChange: noop,
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
