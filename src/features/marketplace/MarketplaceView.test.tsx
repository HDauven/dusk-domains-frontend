import { NetworkFreshnessContext } from '../../app/networkFreshness'
import { MARKETPLACE_SYNC_MESSAGE } from './marketplacePresentation'
import { contractPrincipalFromWalletAccount, encodeBase58 } from '../../names/internal'
import { abbreviate } from '../../utils/format'
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

type MarketplaceOverrides = { [K in Exclude<keyof MarketplaceViewProps, 'takeBackOffers'>]?: Partial<MarketplaceViewProps[K]> } & Pick<MarketplaceViewProps, 'takeBackOffers'>

const seller = `0x${'22'.repeat(32)}`
const buyer = `0x${'33'.repeat(32)}`
const outsider = `0x${'44'.repeat(32)}`

describe('MarketplaceView actions', () => {
  it.each(['fixed sale', 'auction listing', 'auction detail'])('explains renewal to the seller of a %s', kind => {
    const selected = auction()
    const listing = kind === 'fixed sale' ? { listings: { fixedSales: [fixedSale()] } }
      : { listings: { auctions: [selected] }, auction: { selectedAuctionNode: kind === 'auction detail' ? selected.node : '' } }
    expect(render({ ...listing, wallet: { selectedAuthority: seller } })).toContain('Renewal is available after the listing closes.')
    expect(render({ ...listing, wallet: { selectedAuthority: buyer } })).not.toContain('Renewal is available after the listing closes.')
  })

  it('offers more marketplace results and auction activity only when cursors remain', () => {
    expect(render({ market: { hasMore: true } })).toContain('Load more marketplace results')
    expect(render({ market: { hasMore: false } })).not.toContain('Load more marketplace results')
    const selected = auction()
    expect(render({ listings: { auctions: [selected] }, auction: { selectedAuctionNode: selected.node, auctionActivityHasMore: true } })).toContain('Load more auction activity')
  })

  it('asks a disconnected visitor to connect before buying', () => {
    const html = render({ listings: { fixedSales: [fixedSale()] }, wallet: { selectedAddress: '', selectedAuthority: '' } })

    expect(html).toContain('Connect to buy')
    expect(html).not.toContain('>Buy</button>')
  })

  it('allows an eligible buyer and blocks a private-sale outsider', () => {
    const publicHtml = render({ listings: { fixedSales: [fixedSale()] } })
    const privateHtml = render({ listings: { fixedSales: [fixedSale({ privateBuyer: buyer })] }, wallet: { selectedAuthority: outsider } })

    expect(publicHtml).toContain('>Buy for 25 DUSK</button>')
    expect(privateHtml).toMatch(/<button[^>]*disabled=""[^>]*>Private sale<\/button>/)
  })

  it('lets a seller cancel only before an auction receives a bid', () => {
    const dormant = auction()
    const dormantHtml = render({ listings: { auctions: [dormant] }, auction: { selectedAuctionNode: dormant.node }, wallet: { selectedAuthority: seller } })
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
    const liveHtml = render({ listings: { auctions: [live] }, auction: { selectedAuctionNode: live.node }, wallet: { selectedAuthority: seller } })

    expect(dormantHtml).toContain('>Cancel auction</button>')
    expect(liveHtml).toContain('Your name remains in escrow')
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
    const html = render({ listings: { auctions: [endedAuction] }, market: { currentBlockHeight: 1_000 }, auction: { selectedAuctionNode: endedAuction.node }, wallet: { selectedAuthority: outsider } })

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
    const detailHtml = render({ listings: { auctions: [endedAuction] }, market: { currentBlockHeight: 1_000 }, auction: { selectedAuctionNode: endedAuction.node }, wallet: { selectedAuthority: buyer } })
    const activityHtml = render({ listings: { auctions: [endedAuction] }, market: { currentBlockHeight: 1_000 }, wallet: { selectedAuthority: buyer }, navigation: { tab: 'activity' } })

    expect(detailHtml).toContain('You won — finalizing')
    expect(activityHtml).toContain('Won — finalizing')
    expect(activityHtml).toContain('Auction ended')
  })

  it('shows reserve and duration before opening a waiting auction', () => {
    const html = render({ listings: { auctions: [auction()] } })

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
    const html = render({ listings: { auctions: [live] }, auction: { bidReview: {
        amountDusk: '52.5',
        amountLux: 52_500_000_000n,
        auction: live,
        minimumBidLux: 52_500_000_000n,
      }, selectedAuctionNode: live.node }, wallet: { selectedAuthority: buyer } })

    expect(html).toContain('You’re the highest bidder')
    expect(html).toContain('Review transaction')
    expect(html).toContain('Funds move into marketplace escrow')
    expect(html).toContain('Confirm in wallet')
  })

  it('lets the buyer cancel an offer after acquiring the name separately, even while trading is paused', () => {
    const html = render({ navigation: { tab: 'offers' }, offers: { offers: [offer()] }, selling: { sellableNames: [{ ...ownedName(), owner: buyer }] }, wallet: { selectedAuthority: buyer, tradingPaused: true } })
    expect(html).toMatch(/<button(?![^>]*disabled)[^>]*>Cancel<\/button>/)
    expect(html).not.toContain('>Accept</button>')
  })

  it('shows accept, cancel and expiry actions for the right offer state', () => {
    const incomingHtml = render({ navigation: { tab: 'offers' }, offers: { offers: [offer()] }, selling: { sellableNames: [ownedName()] }, wallet: { selectedAuthority: seller } })
    const outgoingHtml = render({ navigation: { tab: 'offers' }, offers: { offers: [offer()] }, wallet: { selectedAuthority: buyer } })
    const expiredHtml = render({ navigation: { tab: 'offers' }, market: { currentBlockHeight: 2_000 }, offers: { offers: [offer({ expiresAtBlockHeight: 1_900 })] }, wallet: { selectedAuthority: buyer } })

    expect(incomingHtml).toContain('>Accept</button>')
    expect(outgoingHtml).toContain('>Cancel</button>')
    expect(expiredHtml).toContain('>Close</button>')
  })
})

function render(overrides: MarketplaceOverrides = {}) {
  return renderToStaticMarkup(<MarketplaceView {...props(overrides)} />)
}

function props(overrides: MarketplaceOverrides): MarketplaceViewProps {
  const noop = vi.fn()
  return {
  ...overrides,
  wallet: {
    actionsAvailable: true,
    selectedAddress: 'dusk1buyer',
    selectedAuthority: buyer,
    onOpenWalletConnection: noop,
    ...overrides.wallet,
  },
  listings: {
    auctions: [],
    fixedSales: [],
    onBuyFixedSale: noop,
    onCancelFixedSale: noop,
    onExpireFixedSale: noop,
    ...overrides.listings,
  },
  auction: {
    auctionActivity: [],
    auctionActivityLoading: false,
    bidDrafts: {},
    bidReview: null,
    selectedAuctionNode: '',
    onBidDraftChange: noop,
    onCancelBidReview: noop,
    onCancelAuction: noop,
    onExpireAuction: noop,
    onOpenAuction: noop,
    onPlaceBid: noop,
    onReviewBid: noop,
    onSettleAuction: noop,
    onCloseAuction: noop,
    ...overrides.auction,
  },
  feedback: {
    confirmation: '',
    error: '',
    txState: null,
    ...overrides.feedback,
  },
  market: {
    currentBlockHeight: 1_200,
    loading: false,
    marketplaceEnabled: true,
    ...overrides.market,
  },
  selling: {
    durationDays: '7',
    fixedPriceDusk: '25',
    feeBps: 250,
    privateBuyer: '',
    reserveDusk: '40',
    saleMode: 'fixed',
    selectedNode: '',
    sellableNames: [],
    onCreateListing: noop,
    onDurationDaysChange: noop,
    onFixedPriceDuskChange: noop,
    onPrivateBuyerChange: noop,
    onReserveDuskChange: noop,
    onSaleModeChange: noop,
    onSelectedNodeChange: noop,
    ...overrides.selling,
  },
  offers: {
    offerAmountDusk: '20',
    offerDurationDays: '7',
    offerName: '',
    offers: [],
    onAcceptOffer: noop,
    onCancelOffer: noop,
    onExpireOffer: noop,
    onOfferAmountDuskChange: noop,
    onOfferDurationDaysChange: noop,
    onOfferNameChange: noop,
    onPlaceOffer: noop,
    ...overrides.offers,
  },
  withdrawal: {
    refund: null,
    onClaimRefund: noop,
    ...overrides.withdrawal,
  },
  navigation: {
    tab: 'browse',
    onTabChange: noop,
    ...overrides.navigation,
  },
  watchlist: {
    watchedNodes: [],
    onToggleWatch: noop,
    ...overrides.watchlist,
  },
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
    saleId: 1, lastEventType: 'domain_fixed_sale_opened',
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
    auctionId: 1, lastEventType: 'domain_auction_created',
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
  const paused = { wallet: { tradingPaused: true } }
  const button = (html: string, label: string) => {
    const match = html.match(new RegExp(`<button[^>]*>${label}</button>`))
    expect(match, label).not.toBeNull()
    return match![0]
  }
  expect(button(render({ ...paused, listings: { fixedSales: [fixedSale()] } }), 'Buy for 25 DUSK')).toContain('disabled')
  expect(button(render({ ...paused, listings: { fixedSales: [fixedSale()] }, wallet: { ...paused.wallet, selectedAuthority: seller } }), 'Cancel listing')).not.toContain('disabled')
  expect(button(render({ ...paused, listings: { fixedSales: [fixedSale({ expiresAtBlockHeight: 1000 })] } }), 'Close listing')).not.toContain('disabled')
  for (const saleMode of ['fixed', 'auction'] as const) {
    expect(button(render({ ...paused, navigation: { tab: 'sell' }, selling: { sellableNames: [ownedName()], saleMode }, wallet: { ...paused.wallet, selectedAuthority: seller } }), saleMode === 'fixed' ? 'List for sale' : 'Start auction')).toContain('disabled')
  }
  expect(button(render({ ...paused, navigation: { tab: 'offers' }, offers: { offers: [offer()] }, selling: { sellableNames: [ownedName()] }, wallet: { ...paused.wallet, selectedAuthority: seller } }), 'Accept')).toContain('disabled')
  expect(button(render({ ...paused, navigation: { tab: 'offers' }, offers: { offers: [offer()] } }), 'Cancel')).not.toContain('disabled')
  expect(button(render({ ...paused, navigation: { tab: 'offers' }, offers: { offers: [offer({ expiresAtBlockHeight: 1000 })] } }), 'Close')).not.toContain('disabled')
  expect(button(render({ ...paused, navigation: { tab: 'offers' } }), 'Review offer')).toContain('disabled')
  const dormant = auction()
  expect(button(render({ ...paused, listings: { auctions: [dormant] }, auction: { selectedAuctionNode: dormant.node } }), 'Review bid')).toContain('disabled')
  expect(button(render({ ...paused, listings: { auctions: [dormant] }, auction: { selectedAuctionNode: dormant.node }, wallet: { ...paused.wallet, selectedAuthority: seller } }), 'Cancel auction')).not.toContain('disabled')
  const ended = auction({ startBlockHeight: 800, endBlockHeight: 1000, highestBid: { bidderAuthority: buyer, amountLux: 40_000_000_000, placedAtBlockHeight: 800 }, bidCount: 1 })
  expect(button(render({ ...paused, listings: { auctions: [ended] }, auction: { selectedAuctionNode: ended.node } }), 'Finalize auction')).not.toContain('disabled')
  expect(button(render({ ...paused, navigation: { tab: 'activity' }, withdrawal: { refund: { authority: buyer, recipient: null, amountLux: 20_000_000_000, txId: 'refund', blockHeight: 1000, lastEventType: 'domain_offer_closed' } } }), 'Withdraw to wallet')).not.toContain('disabled')
  expect(button(render({ ...paused, auction: { bidReview: { amountDusk: '40', amountLux: 40_000_000_000n, minimumBidLux: 40_000_000_000n, auction: dormant } } }), 'Confirm in wallet')).toContain('disabled')
})

it('shows one minimum price before the first bid and labels the seller as You', () => {
  const html = render({ listings: { auctions: [auction()] }, wallet: { selectedAuthority: seller } })
  expect(html).not.toContain('>Minimum bid</dt>')
  expect(html).toContain('>Reserve</dt>')
  expect(html).toContain('Your auction')
})
it('sorts fixed listings and auctions together by ending time', () => {
  const html = render({ listings: { auctions: [auction({ name: 'later.dusk', startDeadlineBlockHeight: 4000 })], fixedSales: [fixedSale({ name: 'sooner.dusk' })] } })
  const text = html.replace(/<[^>]*>/g, '')
  expect(text).toContain('sooner.dusk')
  expect(text).toContain('later.dusk')
  expect(text.indexOf('sooner.dusk')).toBeLessThan(text.indexOf('later.dusk'))
})
it('gives quiet marketplace states a next action without zero stat tiles', () => {
  expect(render()).toContain('Browse names')
  const yours = render({ navigation: { tab: 'activity' } })
  expect(yours).toContain('Browse listings')
  expect(yours).not.toContain('Your marketplace summary')
})

it('lets visitors browse offers without giving them buyer or seller actions', () => {
  const html = render({ navigation: { tab: 'offers' }, offers: { offers: [offer()] }, wallet: { selectedAuthority: outsider } })
  expect(html).toContain('aurora.dusk')
  expect(html).toContain('Filter offers')
  expect(html).toContain('Sort offers')
  expect(html).not.toContain('>Cancel</button>')
  expect(html).not.toContain('>Accept</button>')
})

it('shows only bids from the current auction and one authoritative count', () => {
  const current = auction({ createdAtBlockHeight: 1000, bidCount: 1 })
  const entry = { id: 'bid', eventType: 'domain_bid_placed' as const, actor: buyer, target: '25000000000', blockHeight: 1100, timestamp: '2026-10-01T00:00:00Z', name: current.name, node: current.node, txId: 'bid' }
  const html = render({ listings: { auctions: [current] }, auction: { selectedAuctionNode: current.node, auctionActivity: [entry, { ...entry, id: 'create', eventType: 'domain_auction_created' }, { ...entry, id: 'old', blockHeight: 900 }] } })
  expect(html).toContain('Bids · 1')
  expect(html.match(/>Bid placed</g)).toHaveLength(1)
  expect(html).not.toContain('Auction created')
  expect(html).not.toContain('Marketplace views')
})
it('collapses raising a winning bid and labels the seller as You', () => {
  const current = auction({ highestBid: { bidderAuthority: buyer, amountLux: 25000000000, placedAtBlockHeight: 1000 }, bidCount: 1 })
  const html = render({ listings: { auctions: [current] }, auction: { selectedAuctionNode: current.node } })
  expect(html).toContain('<details class="marketplace-raise-bid"><summary>Raise bid</summary>')
  expect(render({ listings: { auctions: [current] }, auction: { selectedAuctionNode: current.node }, wallet: { selectedAuthority: seller } })).toContain('<span>You</span>')
})
it('shows a successful transaction once with its reference behind Details', () => {
  const html = render({ feedback: { confirmation: 'Bid placed.', txState: { status: 'executed', txId: 'reference', context: { title: 'Bid', fields: [] }, call: { contract: 'marketplace', functionName: 'place_bid_runtime' } } as unknown as MarketplaceViewProps['feedback']['txState'] } })
  expect(html).toContain('Bid placed.')
  expect(html).not.toContain('Transaction confirmed')
  expect(html).toContain('<summary>Details</summary>')
  expect(html).not.toContain('Refresh</button>')
})

it('renders the transaction review with custody and payout terms before wallet approval', () => {
  const html = render({ feedback: { review: { title: 'Buy aurora.dusk', rows: [{ label: 'Your wallet → seller', value: '24.375 DUSK' }, { label: 'Treasury', value: '0.625 DUSK' }], note: 'The name moves to your wallet.' } } })
  expect(html).toContain('Buy aurora.dusk')
  expect(html).toContain('24.375 DUSK')
  expect(html).toContain('0.625 DUSK')
  expect(html).toContain('The name moves to your wallet.')
  expect(html).toContain('Confirm in wallet')
})

it('shows the seller fee and net proceeds for fixed prices and auction minimums', () => {
  for (const saleMode of ['fixed', 'auction'] as const) {
    const html = render({ navigation: { tab: 'sell' }, selling: { saleMode, sellableNames: [ownedName()], fixedPriceDusk: '25', reserveDusk: '25' } })
    expect(html).toContain('24.375 DUSK')
    expect(html).toContain('0.625 DUSK')
    expect(html).toContain('Marketplace fee (2.50%) to treasury')
  }
  expect(render({ navigation: { tab: 'sell' }, selling: { sellableNames: [ownedName()] } })).toContain('Private buyer (optional)')
})

it('does not repeat the first-bid minimum in the detail form', () => {
  const current = auction()
  const html = render({ listings: { auctions: [current] }, auction: { selectedAuctionNode: current.node } })
  expect(html).toContain('>Minimum bid</span>')
  expect(html).not.toContain('>Minimum 40 DUSK</span>')
})


it('keeps browse cards to status, name, amount, time and action', () => {
  const live = auction({ startBlockHeight: 900, endBlockHeight: 2000, highestBid: { amountLux: 36_465_187_500, bidderAuthority: buyer, placedAtBlockHeight: 900 } })
  const html = render({ listings: { auctions: [live], fixedSales: [fixedSale()] } })
  expect(html).toContain('36.47 DUSK')
  expect(html).toContain('title="36.4651875 DUSK"')
  for (const detail of ['Minimum next bid', '>Seller</dt>', 'last 10 minutes', 'Secured in escrow', 'Available to anyone']) expect(html).not.toContain(detail)
})

it('states the closing rule once beside the timer and keeps freshness in navigation', () => {
  const live = auction({ startBlockHeight: 900, endBlockHeight: 2000 })
  const html = render({ listings: { auctions: [live] }, auction: { selectedAuctionNode: live.node }, market: { updatedAt: 1000 } })
  expect(html.match(/Bids in the last 10 minutes/g)).toHaveLength(1)
  expect(html).not.toContain('Closing rule')
  expect(html).toMatch(/marketplace-bid-timer[\s\S]*?Bids in the last 10 minutes extend it to 10 minutes remaining/)
  for (const view of [html, render({ market: { updatedAt: 1000 } })]) {
    expect(view).toMatch(/class="marketplace-navigation">[\s\S]*?<p class="marketplace-freshness">Updated <time[^>]*>[^<]*<\/time><\/p><\/div>/)
    expect(view.match(/>Updated /g)).toHaveLength(1)
  }
})

it('shows the exact bid visibly and abbreviates the receiving wallet with copy', () => {
  const address = 'a'.repeat(100)
  const html = render({ wallet: { selectedAddress: address }, auction: { bidReview: { amountDusk: '38.288446875', amountLux: 38_288_446_875n, minimumBidLux: 38_288_446_875n, auction: auction() } } })
  expect(html.replace(/<[^>]*>/g, '')).toContain('You are bidding38.288446875 DUSK')
  expect(html).toContain('>aaaaaaaaaa...aaaaaa</code>')
  expect(html).not.toContain(`>${address}<`)
  expect(html).toContain('aria-label="Copy If you win, name moves to"')
})

it('does not repeat the optional private buyer explanation', () => {
  const html = render({ navigation: { tab: 'sell' }, selling: { sellableNames: [ownedName()] } })
  expect(html).toContain('Private buyer (optional)')
  expect(html).not.toContain('Leave the private buyer empty')
  expect(html).toContain('title="24.375 DUSK">24.375 DUSK')
  expect(html).toContain('title="0.625 DUSK">0.625 DUSK')
})


it('rounds a first-bid minimum up in both the headline and the draft', () => {
  const current = auction({ reservePriceLux: 1_000_000_001 })
  const html = render({ listings: { auctions: [current] }, auction: { selectedAuctionNode: current.node } })
  expect(html).toContain('title="1.000000001 DUSK">1.01 DUSK')
  expect(html).toContain('value="1.01"')
})

it('uses shared owner labels for sellers, bidders and offers, including explanatory ID fallbacks', () => {
  const listing = render({ listings: { fixedSales:[fixedSale()] }, wallet: { selectedAuthority: outsider } })
  expect(listing).toContain('Owner ID ')
  expect(listing).toContain('No matching Dusk address is available')
  expect(render({ listings: { fixedSales:[fixedSale()] }, wallet: { selectedAuthority:seller } })).toContain('Seller <span>You</span>')
  const current = auction({ highestBid:{bidderAuthority:buyer,amountLux:25_000_000_000,placedAtBlockHeight:1000},bidCount:1 })
  const detail = render({ listings: { auctions:[current] }, auction: { selectedAuctionNode:current.node }, wallet: { selectedAuthority:buyer } })
  expect(detail).toContain('Highest bidder <span>You</span>')
  expect(render({ navigation: { tab:'offers' }, offers: { offers:[offer()] }, wallet: { selectedAuthority:outsider } })).toContain('Owner ID ')
})

it('keeps seller labels compact on both browse cards and copy on the auction page', () => {
  const address = encodeBase58(Uint8Array.from({ length: 96 }, (_, i) => i + 1))
  const parsed = contractPrincipalFromWalletAccount(address)
  if (!parsed.ok) throw new Error('Invalid seller fixture')
  const current = auction({ sellerAuthority: parsed.principal })
  const props = { listings: { auctions: [current], fixedSales: [fixedSale({ sellerAuthority: parsed.principal })] }, wallet: { ownerAddresses: [address] } }
  const cards = render(props)
  expect(cards.match(/class="marketplace-owner"/g)).toHaveLength(2)
  expect(cards.match(new RegExp(`>${abbreviate(address)}<`, 'g'))).toHaveLength(2)
  expect(cards).not.toContain('aria-label="Copy Dusk address"')
  expect(render({ ...props, wallet: { ...props.wallet, selectedAuthority: parsed.principal } }).match(/Seller <span>You<\/span>/g)).toHaveLength(2)
  expect(render({ ...props, auction: { selectedAuctionNode: current.node } })).toContain('aria-label="Copy Dusk address"')
})

it('shows one freshness message when market data or the network is catching up', () => {
  const current = auction()
  for (const selectedAuctionNode of [undefined, current.node]) {
    const input = props({
  listings: {
    auctions: [current],
  },
  auction: {
    selectedAuctionNode,
  },
  market: {
    updatedAt: 1000,
  },
  feedback: {
    error: MARKETPLACE_SYNC_MESSAGE,
  },
})
    const html = renderToStaticMarkup(<MarketplaceView {...input} />)
    expect(html).not.toContain('>Updated ')
    expect(html).toContain(MARKETPLACE_SYNC_MESSAGE)
    const warning = renderToStaticMarkup(<NetworkFreshnessContext value="Name data is behind."><MarketplaceView {...input} /></NetworkFreshnessContext>)
    expect(warning).not.toContain('marketplace-freshness')
  }
})

it.each(['fixed', 'auction', 'detail', 'sell'])('shows the namespace summary in %s views', kind => {
  const namespace = {descendantCount:3,heldByOthersCount:1,subnames:[],ancestors:[]}
  const selected = auction({namespace})
  const html = render(kind === 'fixed' ? { listings: { fixedSales:[fixedSale({namespace})] } } : kind === 'sell'
    ? { navigation: { tab:'sell' }, wallet: { selectedAddress:'wallet' }, selling: { selectedNode:ownedName().node, sellableNames:[{...ownedName(),namespace}] } }
    : { listings: { auctions:[selected] }, auction: { selectedAuctionNode:kind === 'detail' ? selected.node : '' } })
  expect(html).toContain('Includes 3 subnames · 1 held by others')
})

it('offers one post-purchase action for seller-held subnames', () => {
  const html = render({takeBackOffers:[{name:'alice.dusk',count:2,takeBack:vi.fn()}]})
  expect(html).toContain('Take back 2 subnames')
  expect(html).toContain('Taking them back clears their records and primary names.')
})
