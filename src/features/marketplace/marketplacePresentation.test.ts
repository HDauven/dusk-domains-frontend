import { describe, expect, it } from 'vitest'
import type { IndexedMarketplaceAuction } from '../../names/internal'
import {
  auctionDurationLabel,
  auctionStartWindowLabel,
  auctionStatus,
  auctionStatusLabel,
  marketplaceFeeLabel,
} from './marketplacePresentation'

describe('marketplace auction presentation', () => {
  it('describes a dormant auction in consumer terms', () => {
    const auction = fixtureAuction()

    expect(auctionStatus(auction, 100_000)).toBe('waiting')
    expect(auctionStatusLabel('waiting')).toBe('Waiting for first bid')
    expect(auctionDurationLabel(auction.durationBlocks)).toBe('7 days')
    expect(auctionStartWindowLabel(auction, 100_000)).toBe('12d')
  })

  it('distinguishes ending, ended and expired states', () => {
    const live = fixtureAuction({ startBlockHeight: 100_000, endBlockHeight: 100_060 })

    expect(auctionStatus(live, 100_000)).toBe('ending')
    expect(auctionStatus(live, 100_060)).toBe('ended')
    expect(auctionStatus(fixtureAuction(), 200_000)).toBe('expired')
  })

  it('formats marketplace fees without protocol units', () => {
    expect(marketplaceFeeLabel(250)).toBe('2.50%')
    expect(marketplaceFeeLabel(500)).toBe('5%')
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
