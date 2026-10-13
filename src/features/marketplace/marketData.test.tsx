// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ALL_MARKETPLACES, namehashHex } from '../../names/internal'
import { fetchMyHoldings } from '../domains/myDomainsData'
import { useMarketplaceData } from './useMarketplaceData'
import { useNameListing } from './useNameListing'

const old = `0x${'06'.repeat(32)}`
const preferred = `0x${'0c'.repeat(32)}`
const bidder = `0x${'33'.repeat(32)}`
const node = namehashHex('lyra.dusk')
const summaries = [
  { marketplaceContractId: old, state: 'Draining', preferred: false, initialized: true, tradingPaused: true, feeBps: 250, unsettledOrders: 2, refundAccounts: 1, refundableLux: '5000000000', holdsObligations: true },
  { marketplaceContractId: preferred, state: 'Listed', preferred: true, initialized: false, tradingPaused: true, feeBps: null, unsettledOrders: 0, refundAccounts: 0, refundableLux: '0', holdsObligations: false },
]
const refund = (marketplaceContractId: string, amountLux: number) => ({ marketplaceContractId, authority: bidder, amountLux, recipient: null, lastEventType: 'marketplace_refund_claimed', txId: null, blockHeight: null })

function indexer(config: Record<string, unknown>) {
  return {
    getHealth: vi.fn(async () => ({ ok: true, currentBlockHeight: 100 })),
    getMarketplaceFixedSalesPage: vi.fn(async () => ({ fixedSales: [], nextCursor: null })),
    getMarketplaceAuctionsPage: vi.fn(async () => ({ auctions: [], nextCursor: null })),
    getMarketplaceOffersPage: vi.fn(async () => ({ offers: [], nextCursor: null })),
    getMarketplaceFixedSale: vi.fn(async () => null),
    getMarketplaceAuction: vi.fn(async () => null),
    getMarketplaceConfig: vi.fn(async () => config),
    getAllNames: vi.fn(async () => []),
    getAllMarketplaceRefunds: vi.fn(async () => [refund(old, 5_000_000_000), refund(preferred, 0)]),
  }
}
const root = createRoot(document.createElement('div'))
beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true))
afterEach(async () => { await act(async () => root.render(null)); vi.unstubAllGlobals() })

async function load(client: ReturnType<typeof indexer>, listingName = '') {
  let data!: ReturnType<typeof useMarketplaceData>
  function Probe() {
    data = useMarketplaceData({ indexerClient: client as never, accountScope: 'wallet', mainView: 'marketplace', listingName, preferredMarketplace: preferred,
      selectedAddress: 'wallet', selectedAuthority: bidder, setError: () => {} })
    return null
  }
  await act(async () => root.render(<Probe />))
  await vi.waitFor(() => expect(data.hasData).toBe(true))
  return () => data
}

it('reads every market’s orders and the account’s refunds in each, and the preferred market’s config', async () => {
  const client = indexer({ initialized: false, marketplaceContractId: preferred, tradingPaused: true, feeBps: null, config: null, marketplaces: summaries })
  const data = await load(client, 'lyra.dusk')
  for (const page of [client.getMarketplaceFixedSalesPage, client.getMarketplaceAuctionsPage, client.getMarketplaceOffersPage])
    expect(page).toHaveBeenCalledWith(expect.objectContaining({ marketplace: ALL_MARKETPLACES }))
  expect(client.getMarketplaceFixedSale).toHaveBeenCalledWith(node, { marketplace: ALL_MARKETPLACES })
  expect(client.getMarketplaceAuction).toHaveBeenCalledWith(node, { marketplace: ALL_MARKETPLACES })
  expect(client.getMarketplaceConfig).toHaveBeenCalledWith({ marketplace: preferred })
  expect(client.getAllMarketplaceRefunds).toHaveBeenCalledWith(bidder)
  // An empty refund row leaves nothing to withdraw.
  expect(data().refunds.map(row => [row.marketplaceContractId, row.amountLux])).toEqual([[old, 5_000_000_000]])
  expect(data().marketplaces?.map(market => [market.marketplaceContractId, market.tradingPaused])).toEqual([[old, true], [preferred, true]])
  expect(data()).toMatchObject({ feeBps: null, feeStatus: 'unknown' })
})

it('knows the fee once the preferred market’s config has one', async () => {
  const data = await load(indexer({ initialized: true, marketplaceContractId: preferred, tradingPaused: false, feeBps: 300, config: {}, marketplaces: summaries }))
  expect(data()).toMatchObject({ feeBps: 300, feeStatus: 'known' })
})

it('lists a name’s order in whichever market holds it', async () => {
  const client = { getMarketplaceFixedSale: vi.fn(async () => null), getMarketplaceAuction: vi.fn(async () => null) }
  function Probe() { useNameListing({ indexerClient: client as never, node, escrowed: true }); return null }
  await act(async () => root.render(<Probe />))
  await vi.waitFor(() => expect(client.getMarketplaceAuction).toHaveBeenCalled())
  expect(client.getMarketplaceFixedSale).toHaveBeenCalledWith(node, { marketplace: ALL_MARKETPLACES })
  expect(client.getMarketplaceAuction).toHaveBeenCalledWith(node, { marketplace: ALL_MARKETPLACES })
})

it('shows My names listings in every market', async () => {
  const client = { getAllNames: vi.fn(async () => []), getAllMarketplaceFixedSales: vi.fn(async () => []), getAllMarketplaceAuctions: vi.fn(async () => []),
    getPrimaryName: vi.fn(async () => null), getSubname: vi.fn(async () => null) }
  await fetchMyHoldings({ indexerClient: client as never, selectedAddress: 'wallet', selectedAuthority: bidder, chainId: 'dusk:0' })
  expect(client.getAllMarketplaceFixedSales).toHaveBeenCalledWith(undefined, { marketplace: ALL_MARKETPLACES })
  expect(client.getAllMarketplaceAuctions).toHaveBeenCalledWith(undefined, { marketplace: ALL_MARKETPLACES })
})
