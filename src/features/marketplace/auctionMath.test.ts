import { describe, expect, it } from 'vitest'
import type { IndexedMarketplaceAuction } from '../../names/internal'
import {
  compactLuxAsDusk,
  currentBidDraft,
  validLuxAmount,
  durationBlocks,
  MIN_MARKETPLACE_AMOUNT_LUX,
  minimumBidDusk,
  minimumBidLux,
} from './auctionMath'

describe('auction math', () => {
  it('uses the reserve for the first bid', () => {
    const auction = fixtureAuction()

    expect(minimumBidLux(auction)).toBe(40_000_000_000n)
    expect(minimumBidDusk(auction)).toBe('40')
  })

  it('rounds the five percent increment up to the next lux', () => {
    const auction = fixtureAuction({
      highestBid: {
        bidderAuthority: `0x${'33'.repeat(32)}`,
        amountLux: 1_000_000_001,
        placedAtBlockHeight: 100_100,
      },
    })

    expect(minimumBidLux(auction)).toBe(1_050_000_002n)
    expect(minimumBidDusk(auction)).toBe('1.06')
  })

  it('converts days to Dusk block durations', () => {
    expect(durationBlocks(7)).toBe(60_480)
  })

  it('uses a one DUSK storage-economic floor', () => {
    expect(MIN_MARKETPLACE_AMOUNT_LUX).toBe(1_000_000_000n)
  })
})

function fixtureAuction(overrides: Partial<IndexedMarketplaceAuction> = {}): IndexedMarketplaceAuction {
  return {
    node: `0x${'11'.repeat(32)}`,
    name: 'aurora.dusk',
    sellerAuthority: `0x${'22'.repeat(32)}`,
    reservePriceLux: 40_000_000_000,
    durationBlocks: 60_480,
    startDeadlineBlockHeight: 200_000,
    feeBps: 250,
    startBlockHeight: null,
    endBlockHeight: null,
    highestBid: null,
    bidCount: 0,
    createdAtBlockHeight: 100_000,
    marketplaceContractId: `0x${'55'.repeat(32)}`,
    escrowed: true,
    txId: 'tx-auction',
    blockHeight: 100_000,
    auctionId: 1, lastEventType: 'domain_auction_created',
    ...overrides,
  }
}


it('keeps displayed amounts short without hiding tiny nonzero values', () => {
  for (const [lux, expected] of [
    [36_465_187_500n, '36.47'], [38_288_446_875n, '38.29'],
    [24_375_000_000n, '24.38'], [625_000_000n, '0.63'],
    [0n, '0'], [1n, '0.000000001'], [4_900_000n, '0.005'],
    [5_000_000n, '0.01'], [250_000_000_000_000n, '250000'],
    [9_007_199_254_740_991n, '9007199.25'],
  ] as const) expect(compactLuxAsDusk(lux)).toBe(expected)
})

it('rounds displayed minimums up, including reserves, and preserves valid typed bids', () => {
  for (const auction of [
    fixtureAuction({ reservePriceLux: 1_000_000_001 }),
    fixtureAuction({ highestBid: { amountLux: 36_465_187_500, bidderAuthority: 'buyer', placedAtBlockHeight: 1 } }),
  ]) {
    const shown = minimumBidDusk(auction)
    expect(shown).toBe(auction.highestBid ? '38.29' : '1.01')
    expect(validLuxAmount(shown)).toBeGreaterThanOrEqual(minimumBidLux(auction))
    expect(currentBidDraft('0', auction)).toBe(shown)
    expect(currentBidDraft('50.123456789', auction)).toBe('50.123456789')
  }
})
