import { expect, it } from 'vitest'
import type { IndexedMarketplaceSummary } from '../../names/internal'
import { marketTakesNewOrders } from './marketAvailability'

const market = `0x${'1e'.repeat(32)}`
const row = (overrides: Partial<IndexedMarketplaceSummary>): IndexedMarketplaceSummary => ({
  marketplaceContractId: market, state: 'Listed', preferred: true, authenticated: true, initialized: true, tradingPaused: false, feeBps: 250,
  unsettledOrders: 0, refundAccounts: 0, refundableLux: '0', holdsObligations: false, ...overrides,
})

it('takes new orders only at an authenticated, listed market that isn’t paused', () => {
  const at = (summary: IndexedMarketplaceSummary) => marketTakesNewOrders(market, { marketplaces: [summary], preferred: market, tradingPaused: false })
  expect(at(row({}))).toBe(true)
  expect(at(row({ tradingPaused: true }))).toBe(false)
  // A market the indexer hasn't authenticated serves nothing, so it takes no new orders here.
  expect(at(row({ authenticated: false, initialized: false, feeBps: null, unsettledOrders: null, refundAccounts: null, refundableLux: null, holdsObligations: null }))).toBe(false)
  expect(marketTakesNewOrders(market, { marketplaces: [], preferred: market, tradingPaused: false })).toBe(false)
})
