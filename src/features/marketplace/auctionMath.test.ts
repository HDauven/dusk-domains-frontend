import { describe, expect, it } from 'vitest'
import type { IndexedMarketplaceAuction } from '../../names/internal'
import {
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
    expect(minimumBidDusk(auction)).toBe('1.050000002')
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
    lastEventType: 'domain_auction_created',
    ...overrides,
  }
}
