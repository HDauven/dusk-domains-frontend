// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useAuctions } from './useAuctions'
import type { DuskDomainsOnChainAuction, IndexedMarketplaceAuction } from '../../names/internal'

let root: Root
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  root = createRoot(document.createElement('div'))
})
afterEach(async () => { await act(async () => root.unmount()); vi.unstubAllGlobals() })

async function setup() {
  const auction = {
    auctionId: 7, node: 'node', name: 'example.dusk', sellerAuthority: 'seller',
    reservePriceLux: 10_000_000_000, durationBlocks: 8640, startDeadlineBlockHeight: 1000,
    createdAtBlockHeight: 100, feeBps: 250, startBlockHeight: null, endBlockHeight: null,
    highestBid: null, bidCount: 0,
  } as IndexedMarketplaceAuction
  const live: DuskDomainsOnChainAuction = { ...auction, reservePriceLux: 10_000_000_000n, highestBid: null, startBlock: null, endBlock: null }
  const auctions = [auction]
  const submit = vi.fn(async () => null)
  const setError = vi.fn()
  let feature: ReturnType<typeof useAuctions>
  function Probe() {
    feature = useAuctions({ accountScope: 'account', marketScope: 'market', auctions,
      indexerClient: null, marketplaceOnChainClient: { getAuction: async () => ({ ok: true, value: { ...live } }) } as never,
      selectedAuthority: 'bidder', selectedAuctionNode: '', setSelectedAuctionNode: vi.fn(), setConfirmation: vi.fn(), setError,
      onBidPlaced: vi.fn(), writes: { submit, guardCanonicalRead: async (read: (client: unknown) => Promise<unknown>) => { await read({ getAuction: async () => ({ ok: true, value: live }) }); return true } } as never,
    })
    return null
  }
  await act(async () => { root.render(<Probe />) })
  await act(async () => { feature.setBidDraft(auction.node, '25') })
  return { auction, live, submit, setError, feature: () => feature }
}

it('signs the identity and amount captured at review', async () => {
  const h = await setup()
  await act(async () => { await h.feature().reviewBid(h.auction) })
  await act(async () => { await h.feature().placeBid({ ...h.auction, auctionId: 99 }) })
  expect(h.submit).toHaveBeenCalledWith('placing this bid', 'example.dusk', expect.objectContaining({ args: {
    node: 'node', expectedAuctionId: 7, amountLux: 25_000_000_000, bidderManager: 'bidder',
  } }), expect.any(String))
})

it.each([{ auctionId: 8 }, { durationBlocks: 259200 }, { sellerAuthority: 'another-seller' }, { reservePriceLux: 11_000_000_000n }, { startDeadlineBlockHeight: 2000 }, { feeBps: 500 }])('rejects changed reviewed auction terms: %o', async changed => {
  const h = await setup()
  await act(async () => { await h.feature().reviewBid(h.auction) })
  Object.assign(h.auction, changed)
  Object.assign(h.live, changed)
  await act(async () => { await h.feature().placeBid(h.auction) })
  expect(h.submit).not.toHaveBeenCalled()
  expect(h.setError).toHaveBeenCalledWith(expect.stringContaining('changed on-chain'))
})

it('requires a review before placing a bid', async () => {
  const h = await setup()
  await act(async () => { await h.feature().placeBid(h.auction) })
  expect(h.submit).not.toHaveBeenCalled()
  expect(h.setError).toHaveBeenCalledWith('Review this bid before submitting it.')
})

it.each(['cancelAuction', 'expireAuction', 'settleAuction'] as const)('binds %s to the reviewed auction', async action => {
  const h = await setup()
  await act(async () => { await h.feature()[action](h.auction) })
  expect(h.submit).toHaveBeenCalledWith(expect.any(String), 'example.dusk', expect.objectContaining({ args: { node: 'node', expectedAuctionId: 7 } }), expect.any(String))
})

it.each([20_000_000_000n, 30_000_000_000n])('submits the chosen amount after an intervening bid of %s and leaves the minimum to the contract', async amountLux => {
  const h = await setup()
  await act(async () => { await h.feature().reviewBid(h.auction) })
  Object.assign(h.live, {
    bidCount: 1, startBlock: 101, endBlock: 8741,
    highestBid: { bidderAuthority: 'other-bidder', amountLux, placedAtBlock: 101 },
  })
  await act(async () => { await h.feature().placeBid(h.auction) })
  expect(h.submit).toHaveBeenCalledWith('placing this bid', 'example.dusk', expect.objectContaining({ args: {
    node: 'node', expectedAuctionId: 7, amountLux: 25_000_000_000, bidderManager: 'bidder',
  } }), expect.any(String))
  expect(h.setError).not.toHaveBeenCalledWith(expect.stringContaining('changed on-chain'))
})

it('shows the canonical highest bid and end height as review information', async () => {
  const h = await setup()
  Object.assign(h.live, {
    bidCount: 1, startBlock: 101, endBlock: 8741,
    highestBid: { bidderAuthority: 'other-bidder', amountLux: 20_000_000_000n, placedAtBlock: 101 },
  })
  await act(async () => { await h.feature().reviewBid(h.auction) })
  expect(h.feature().bidReview).toMatchObject({
    amountLux: 25_000_000_000n, minimumBidLux: 21_000_000_000n,
    auction: { startBlockHeight: 101, endBlockHeight: 8741, bidCount: 1,
      highestBid: { bidderAuthority: 'other-bidder', amountLux: 20_000_000_000, placedAtBlockHeight: 101 } },
  })
})
