// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  createDuskDomainsRuntimeConfig,
  namehashHex,
  type IndexedMarketplaceAuction,
  type IndexedMarketplaceRefund,
  type IndexedMarketplaceSummary,
  type IndexedNameSummary,
} from '../../names/internal'
import { handoffEnv } from '../../test/handoffFixtures'
import { account } from '../../test/frozenFixtures'
import { MARKET_FEE_UNKNOWN, MARKET_NOT_TAKING_BIDS } from './marketAvailability'
import { useMarketplaceFeature } from './useMarketplaceFeature'

const seller = `0x${'22'.repeat(32)}`
const bidder = `0x${'33'.repeat(32)}`
// The market orders were placed at before a SetPreferredMarketplace, now draining, and the one preferred now.
const old = `0x${'06'.repeat(32)}`
const preferred = `0x${'0c'.repeat(32)}`
const name = { node: namehashHex('aurora.dusk'), canonicalName: 'aurora.dusk', owner: seller, manager: seller, status: 'active', records: [], namespace: [] } as unknown as IndexedNameSummary
const auctionAt = (marketplaceContractId: string): IndexedMarketplaceAuction => ({
  node: namehashHex('lyra.dusk'), name: 'lyra.dusk', sellerAuthority: seller, reservePriceLux: 40_000_000_000, durationBlocks: 60_480,
  startDeadlineBlockHeight: 2_000, feeBps: 250, startBlockHeight: null, endBlockHeight: null, highestBid: null, bidCount: 0, createdAtBlockHeight: 1_000,
  marketplaceContractId, escrowed: true, txId: null, blockHeight: null, auctionId: 2, lastEventType: 'domain_auction_created',
})
const summary = (marketplaceContractId: string, overrides: Partial<IndexedMarketplaceSummary> = {}): IndexedMarketplaceSummary => ({
  marketplaceContractId, state: 'Listed', preferred: false, initialized: true, tradingPaused: false, feeBps: 250,
  unsettledOrders: 0, refundAccounts: 0, refundableLux: '0', holdsObligations: false, ...overrides,
})
const refundAt = (marketplaceContractId: string, amountLux: number): IndexedMarketplaceRefund => ({
  marketplaceContractId, authority: bidder, amountLux, recipient: null, lastEventType: 'marketplace_refund_claimed', txId: null, blockHeight: null,
})
const baseData = {
  ownedNames: [name], auctions: [] as IndexedMarketplaceAuction[], fixedSales: [], offers: [], refunds: [] as IndexedMarketplaceRefund[],
  feeBps: 250 as number | null, feeStatus: 'known' as 'loading' | 'known' | 'unknown', marketplaces: [summary(old), summary(preferred, { preferred: true })],
  hasData: true, readError: '', loading: false, hasMore: false, updatedAt: 1, currentBlockHeight: 1_200, auctionPollingEnabled: false,
  loadMarketplace: vi.fn(async () => {}), loadMore: vi.fn(),
}
let data = baseData
vi.mock('./useMarketplaceData', () => ({ useMarketplaceData: () => data }))
vi.mock('./canonicalMarketplaceState', async original => ({
  ...await original<typeof import('./canonicalMarketplaceState')>(),
  canonicalOwnedName: vi.fn(async () => ({ currentBlockHeight: 100, ref: null })),
  canonicalOfferTarget: vi.fn(async () => ({ currentBlockHeight: 100, ref: null })),
  canonicalOfferAbsent: vi.fn(async () => {}),
  canonicalAuction: vi.fn(async () => ({ order: {}, reservePriceLux: 40_000_000_000n, highestBid: null, startBlock: null, endBlock: null, bidCount: 0 })),
  canonicalRefund: vi.fn(async () => ({})),
}))

const runtimeConfig = createDuskDomainsRuntimeConfig({ ...handoffEnv, VITE_DUSK_DOMAINS_INDEXER_URL: '/api', VITE_DUSK_DOMAINS_ENABLE_LIVE_WRITES: 'true', VITE_DUSK_DOMAINS_ENABLE_MARKETPLACE: 'true' })
let root: Root
let feature: ReturnType<typeof useMarketplaceFeature>
const submitNameWrite = Object.assign(vi.fn(async () => ({ status: 'rejected' })), { captureSession: () => () => true, captureWorkspace: () => () => true })
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  root = createRoot(document.createElement('div'))
  submitNameWrite.mockClear()
  data = baseData
})
afterEach(async () => { await act(async () => root.unmount()); vi.unstubAllGlobals() })

async function render(selectedAuthority = seller, tradingPaused = false) {
  function Probe() {
    feature = useMarketplaceFeature({
      tradingPaused, ensurePublicBalanceForLiveWrite: async () => true, indexerClient: null,
      duskDomainsOnChainClient: { getCurrentBlockHeight: async () => ({ ok: true, value: 100 }) } as never, liveWritesAvailable: true,
      marketplaceOnChainClient: {} as never, mainView: 'marketplace', onOpenWalletConnection: vi.fn(), runtimeConfig,
      selectedAddress: account, selectedAuthority, submitNameWrite: submitNameWrite as never, preferredMarketplace: preferred,
    })
    return null
  }
  await act(async () => root.render(<Probe />))
}
const reviewed = (action: () => unknown) => (action as (reviewed: boolean) => Promise<void>)(true)
// A view handler that starts an async review returns nothing to await.
const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })
const submitted = () => submitNameWrite.mock.calls.map(call => (call as unknown[])[1] as { functionName: string, contractId?: string })

it('refuses new listings and offers plainly while the preferred market’s fee is unknown, never assuming one', async () => {
  data = { ...baseData, feeBps: null, feeStatus: 'unknown', marketplaces: [summary(old), summary(preferred, { preferred: true, initialized: false, tradingPaused: true, feeBps: null })] }
  await render()
  expect(feature.marketplaceProps.selling.feeBps).toBeNull()
  expect(feature.marketplaceProps.selling.newOrdersRefusal).toBe(MARKET_FEE_UNKNOWN)
  await act(async () => { await reviewed(feature.marketplaceProps.selling.onCreateListing) })
  expect(feature.marketplaceProps.feedback.error).toBe(MARKET_FEE_UNKNOWN)
  await act(async () => { feature.marketplaceProps.offers.onOfferNameChange('other.dusk') })
  await act(async () => { await reviewed(feature.marketplaceProps.offers.onPlaceOffer) })
  expect(feature.marketplaceProps.feedback.error).toBe(MARKET_FEE_UNKNOWN)
  expect(submitNameWrite).not.toHaveBeenCalled()
})

it('takes no bid on an auction in a market that isn’t taking new orders, and says why', async () => {
  const draining = auctionAt(old)
  data = { ...baseData, auctions: [draining], marketplaces: [summary(old, { state: 'Draining', tradingPaused: true }), summary(preferred, { preferred: true })] }
  await render(bidder)
  expect(feature.marketplaceProps.auction.bidRefusal?.(draining)).toBe(MARKET_NOT_TAKING_BIDS)
  await act(async () => { feature.marketplaceProps.auction.onReviewBid(draining) })
  await settle()
  expect(feature.marketplaceProps.auction.bidReview).toBeNull()
  expect(feature.marketplaceProps.feedback.error).toBe(MARKET_NOT_TAKING_BIDS)
})

it('takes bids in a market the directory still lists after it stopped preferring it', async () => {
  const listed = auctionAt(old)
  data = { ...baseData, auctions: [listed] }
  await render(bidder)
  expect(feature.marketplaceProps.auction.bidRefusal?.(listed)).toBeNull()
  await act(async () => { feature.marketplaceProps.auction.onBidDraftChange(listed.node, '40') })
  await act(async () => { feature.marketplaceProps.auction.onReviewBid(listed) })
  await settle()
  expect(feature.marketplaceProps.feedback.error).toBe('')
  expect(feature.marketplaceProps.auction.bidReview?.auction.marketplaceContractId).toBe(old)
})

it('takes no bid in a market the indexer doesn’t describe', async () => {
  const unknown = auctionAt(`0x${'0d'.repeat(32)}`)
  data = { ...baseData, auctions: [unknown] }
  await render(bidder)
  expect(feature.marketplaceProps.auction.bidRefusal?.(unknown)).toBe(MARKET_NOT_TAKING_BIDS)
})

it('withdraws each market’s refund from that market', async () => {
  data = { ...baseData, refunds: [refundAt(old, 5_000_000_000), refundAt(preferred, 2_000_000_000)] }
  await render(bidder)
  expect(feature.marketplaceProps.withdrawal.refunds.map(refund => refund.marketplaceContractId)).toEqual([old, preferred])
  for (const refund of feature.marketplaceProps.withdrawal.refunds) await act(async () => { await feature.marketplaceProps.withdrawal.onClaimRefund(refund) })
  expect(submitted().map(call => [call.functionName, call.contractId])).toEqual([['claim_refund', old], ['claim_refund', preferred]])
})
