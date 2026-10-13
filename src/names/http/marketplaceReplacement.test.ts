import { afterEach, expect, it, vi } from 'vitest'
import { namehashHex } from '../hash'
import { ALL_MARKETPLACES, createDuskDomainsIndexerClient } from './client'

afterEach(() => vi.unstubAllGlobals())

const id = (n: number) => `0x${n.toString(16).padStart(2, '0').repeat(32)}`
const old = id(6), preferred = id(20), unconfigured = id(22)
const node = namehashHex('aurora.dusk')
const buyer = id(14)

const summary = (marketplaceContractId: string, overrides: Record<string, unknown> = {}) => ({
  marketplaceContractId, state: 'Listed', preferred: false, initialized: true, tradingPaused: false, feeBps: 250,
  unsettledOrders: 0, refundAccounts: 0, refundableLux: '0', holdsObligations: false, ...overrides,
})
// The preferred market was listed after launch and the indexer hasn't authenticated its configuration.
const unknownConfig = {
  initialized: false, marketplaceContractId: unconfigured, tradingPaused: true, feeBps: null, orderApiVersion: 1, config: null, markets: {},
  marketplaces: [
    summary(old, { state: 'Draining', tradingPaused: true, unsettledOrders: 3, refundAccounts: 1, refundableLux: '5000000000', holdsObligations: true }),
    summary(preferred, { feeBps: 300 }),
    summary(unconfigured, { preferred: true, initialized: false, tradingPaused: true, feeBps: null }),
  ],
}
const fixedSale = (marketplaceContractId: string) => ({
  node, name: 'aurora.dusk', sellerAuthority: id(9), priceLux: '25000000000', privateBuyer: null, feeBps: 250,
  expiresAtBlockHeight: 2000, openedAtBlockHeight: 1000, marketplaceContractId, escrowed: true, txId: null, blockHeight: null,
  saleId: '1', lastEventType: 'domain_fixed_sale_opened',
})
const auction = (marketplaceContractId: string) => ({
  node, name: 'aurora.dusk', sellerAuthority: id(9), reservePriceLux: '40000000000', durationBlocks: 60480, startDeadlineBlockHeight: 2000,
  feeBps: 250, startBlockHeight: null, endBlockHeight: null, highestBid: null, bidCount: 0, createdAtBlockHeight: 1000,
  marketplaceContractId, escrowed: true, txId: null, blockHeight: null, auctionId: '2', lastEventType: 'domain_auction_created',
})

function indexer(routes: Record<string, (url: URL) => unknown>) {
  const requests: string[] = []
  const fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input))
    requests.push(`${url.pathname}${url.search}`)
    const route = routes[url.pathname]
    if (!route) return Response.json({ error: 'not_found' }, { status: 404 })
    return Response.json(route(url))
  })
  return { requests, client: createDuskDomainsIndexerClient({ baseUrl: 'http://indexer.test', fetch: fetch as typeof globalThis.fetch }) }
}

it('accepts a market without an authenticated configuration, with its fee unknown, never a default', async () => {
  const { client } = indexer({ '/marketplace/config': () => unknownConfig })
  const config = await client.getMarketplaceConfig()
  expect(config).toMatchObject({ initialized: false, feeBps: null, tradingPaused: true, marketplaceContractId: unconfigured })
  expect(config.marketplaces?.map(market => [market.marketplaceContractId, market.state, market.tradingPaused, market.feeBps])).toEqual([
    [old, 'Draining', true, 250],
    [preferred, 'Listed', false, 300],
    [unconfigured, 'Listed', true, null],
  ])
})

it('keeps the market config when one market summary is malformed', async () => {
  const { client } = indexer({ '/marketplace/config': () => ({ ...unknownConfig, marketplaces: [{ marketplaceContractId: 7 }, ...unknownConfig.marketplaces] }) })
  const config = await client.getMarketplaceConfig()
  expect(config.marketplaces?.map(market => market.marketplaceContractId)).toEqual([old, preferred, unconfigured])
})

it('keeps the summary of a market the indexer hasn’t authenticated, with nothing it holds counted', async () => {
  const foreign = id(30)
  const unauthenticated = summary(foreign, { authenticated: false, initialized: false, tradingPaused: true, feeBps: null,
    unsettledOrders: null, refundAccounts: null, refundableLux: null, holdsObligations: null })
  const { client } = indexer({ '/marketplace/config': () => ({ ...unknownConfig,
    marketplaces: [...unknownConfig.marketplaces.map(market => ({ ...market, authenticated: true })), unauthenticated] }) })
  const config = await client.getMarketplaceConfig()
  expect(config.marketplaces?.map(market => market.marketplaceContractId)).toEqual([old, preferred, unconfigured, foreign])
  expect(config.marketplaces?.at(-1)).toEqual(unauthenticated)
  // Counts are null only where the market is unauthenticated, and a malformed count still drops the row.
  for (const malformed of [{ unsettledOrders: -1 }, { refundableLux: '1.5' }, { holdsObligations: 'no' }, { authenticated: 'no' }]) {
    const { client } = indexer({ '/marketplace/config': () => ({ ...unknownConfig, marketplaces: [summary(foreign, malformed)] }) })
    expect((await client.getMarketplaceConfig()).marketplaces).toEqual([])
  }
})

it('asks for one market’s config and refuses to ask for every market’s', async () => {
  const { client, requests } = indexer({ '/marketplace/config': () => ({ ...unknownConfig, initialized: true, marketplaceContractId: preferred, tradingPaused: false, feeBps: 300, config: {} }) })
  expect((await client.getMarketplaceConfig({ marketplace: preferred })).feeBps).toBe(300)
  expect(requests).toEqual([`/marketplace/config?marketplace=${preferred}`])
  await expect(client.getMarketplaceConfig({ marketplace: ALL_MARKETPLACES })).rejects.toThrow()
  expect(requests).toHaveLength(1)
})

it('lists orders in every market, each with the market it was placed at', async () => {
  const { client, requests } = indexer({
    '/marketplace/fixed-sales': () => ({ fixedSales: [fixedSale(old)], nextCursor: null }),
    '/marketplace/auctions': () => ({ auctions: [auction(old)], nextCursor: null }),
    '/marketplace/offers': () => ({ offers: [], nextCursor: null }),
  })
  expect((await client.getMarketplaceFixedSalesPage({ marketplace: ALL_MARKETPLACES })).fixedSales.map(sale => sale.marketplaceContractId)).toEqual([old])
  expect((await client.getAllMarketplaceAuctions(undefined, { marketplace: ALL_MARKETPLACES })).map(sale => sale.marketplaceContractId)).toEqual([old])
  await client.getMarketplaceOffersPage({ buyerAuthority: buyer, marketplace: ALL_MARKETPLACES })
  expect(requests).toEqual([
    '/marketplace/fixed-sales?marketplace=all',
    '/marketplace/auctions?limit=200&marketplace=all',
    `/marketplace/offers?buyerAuthority=${buyer}&marketplace=all`,
  ])
})

it('reads a name’s listing in any market, and still checks a named market', async () => {
  const { client, requests } = indexer({
    '/marketplace/fixed-sale': () => fixedSale(old),
    '/marketplace/auction': () => auction(old),
  })
  expect((await client.getMarketplaceFixedSale(node, { marketplace: ALL_MARKETPLACES }))?.marketplaceContractId).toBe(old)
  expect((await client.getMarketplaceAuction(node, { marketplace: ALL_MARKETPLACES }))?.marketplaceContractId).toBe(old)
  expect(requests).toEqual([`/marketplace/fixed-sale?node=${node}&marketplace=all`, `/marketplace/auction?node=${node}&marketplace=all`])
  await expect(client.getMarketplaceAuction(node, { marketplace: preferred })).rejects.toThrow('marketplace auction')
})

it('reads an account’s refunds in every market', async () => {
  const { client, requests } = indexer({
    '/marketplace/refunds': () => ({ refunds: [
      { marketplaceContractId: old, authority: buyer, amountLux: '5000000000' },
      { marketplaceContractId: preferred, authority: buyer, amountLux: '0' },
    ], nextCursor: null }),
  })
  const refunds = await client.getAllMarketplaceRefunds(buyer)
  expect(refunds.map(refund => [refund.marketplaceContractId, refund.authority, refund.amountLux])).toEqual([[old, buyer, 5e9], [preferred, buyer, 0]])
  expect(requests).toEqual([`/marketplace/refunds?authority=${buyer}&limit=200`])
})

it('refuses refund rows that don’t name their market or the account asked for', async () => {
  for (const row of [{ authority: buyer, amountLux: '1' }, { marketplaceContractId: old, authority: id(15), amountLux: '1' }]) {
    const { client } = indexer({ '/marketplace/refunds': () => ({ refunds: [row], nextCursor: null }) })
    await expect(client.getAllMarketplaceRefunds(buyer)).rejects.toThrow()
  }
})

it('accepts the read-model schema version the indexer raises with unknown market fees', async () => {
  const health = { ok: true, generatedAt: '2026-10-13T10:00:00.000Z', source: 'sqlite', mode: 'sqlite', apiVersion: 'v1', schemaVersion: 1,
    eventSchemaVersion: '1', currentBlockHeight: 10, finalizedBlockHeight: 10, lagBlocks: 0, routes: ['/health'], names: 0 }
  for (const readModelSchemaVersion of [2, 3, '3']) {
    const { client } = indexer({ '/health': () => ({ ...health, readModelSchemaVersion }) })
    expect((await client.getHealth()).readModelSchemaVersion).toBe(readModelSchemaVersion)
  }
})
