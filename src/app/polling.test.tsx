// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { useOperatorPause } from './useOperatorPause'
import { useIndexerFreshness } from './useIndexerFreshness'
import { useMarketplaceData } from '../features/marketplace/useMarketplaceData'

const root = createRoot(document.createElement('div'))
afterEach(async () => { await act(async () => root.render(null)); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

it('shares health, pauses all market polls while hidden and reads once on visibility', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.useFakeTimers()
  let visible = true
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visible ? 'visible' : 'hidden')
  const client = {
    getHealth: vi.fn(async () => ({ ok: true, currentBlockHeight: 100 })),
    getMarketplaceFixedSalesPage: vi.fn(async () => ({ fixedSales: [], nextCursor: null })),
    getMarketplaceAuctionsPage: vi.fn(async () => ({ auctions: [], nextCursor: null })),
    getMarketplaceOffersPage: vi.fn(async () => ({ offers: [], nextCursor: null })),
    getMarketplaceConfig: vi.fn(async () => ({ feeBps: 100 })),
  }
  function Probe() {
    useOperatorPause(client as never, 'test')
    useIndexerFreshness(client as never, false)
    useMarketplaceData({ indexerClient: client as never, accountScope: '', mainView: 'marketplace', selectedAddress: '', selectedAuthority: '', setError: () => {} })
    return null
  }
  await act(async () => root.render(<Probe />))
  expect(client.getHealth).toHaveBeenCalledTimes(1)
  visible = false
  await act(async () => { document.dispatchEvent(new Event('visibilitychange')); await vi.advanceTimersByTimeAsync(180_000) })
  expect(client.getHealth).toHaveBeenCalledTimes(1)
  expect(client.getMarketplaceConfig).toHaveBeenCalledTimes(1)
  visible = true
  await act(async () => { document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('focus')) })
  expect(client.getHealth).toHaveBeenCalledTimes(2)
  expect(client.getMarketplaceAuctionsPage).toHaveBeenCalledTimes(2)
})

it('keeps listings and pagination after a failed market refresh and clears the notice on recovery', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const sale = { node: 'node', name: 'alpha.dusk' }
  let fail = false
  const client = {
    getHealth: async () => ({ ok: true, currentBlockHeight: 100 }),
    getMarketplaceFixedSalesPage: async () => { if (fail) throw new Error('HTTP 429'); return { fixedSales: [sale], nextCursor: 'next' } },
    getMarketplaceAuctionsPage: async () => ({ auctions: [], nextCursor: null }),
    getMarketplaceOffersPage: async () => ({ offers: [], nextCursor: null }),
  }
  const setError = vi.fn()
  let data: ReturnType<typeof useMarketplaceData>
  function Probe() { data = useMarketplaceData({ indexerClient: client as never, accountScope: '', mainView: '', selectedAddress: '', selectedAuthority: '', setError }); return null }
  await act(async () => root.render(<Probe />))
  await act(async () => { await data.loadMarketplace() })
  fail = true
  await act(async () => { await data.loadMarketplace(true) })
  expect(data!.fixedSales).toEqual([sale])
  expect(data!.hasMore).toBe(true)
  expect(data!.readError).toBe("Couldn't refresh. Retrying…")
  fail = false
  await act(async () => { await data.loadMarketplace(true) })
  expect(data!.readError).toBe('')
})

it('does not poll operator pause in a hidden tab, including a hidden mount', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.useFakeTimers()
  let visible = false
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visible ? 'visible' : 'hidden')
  const getHealth = vi.fn(async () => ({ ok: true }))
  const client = { getHealth } as never
  function Probe() { useOperatorPause(client, 'hidden'); return null }
  await act(async () => root.render(<Probe />))
  await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
  expect(getHealth).not.toHaveBeenCalled()
  visible = true
  await act(async () => document.dispatchEvent(new Event('visibilitychange')))
  expect(getHealth).toHaveBeenCalledTimes(1)
})

it('resumes marketplace reads on visibility without waiting for its next interval', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.useFakeTimers()
  let visible = true
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visible ? 'visible' : 'hidden')
  const getMarketplaceConfig = vi.fn(async () => ({ feeBps: 100 }))
  const getMarketplaceAuctionsPage = vi.fn(async () => ({ auctions: [], nextCursor: null }))
  const client = {
    getHealth: async () => ({ ok: true }), getMarketplaceConfig,
    getMarketplaceFixedSalesPage: async () => ({ fixedSales: [], nextCursor: null }),
    getMarketplaceAuctionsPage,
    getMarketplaceOffersPage: async () => ({ offers: [], nextCursor: null }),
  } as never
  function Probe() { useMarketplaceData({ indexerClient: client, accountScope: '', mainView: 'marketplace', selectedAddress: '', selectedAuthority: '', setError: () => {} }); return null }
  await act(async () => root.render(<Probe />))
  visible = false
  await act(async () => { document.dispatchEvent(new Event('visibilitychange')); await vi.advanceTimersByTimeAsync(60_000) })
  expect(getMarketplaceAuctionsPage).toHaveBeenCalledTimes(1)
  visible = true
  await act(async () => document.dispatchEvent(new Event('visibilitychange')))
  expect(getMarketplaceAuctionsPage).toHaveBeenCalledTimes(2)
})
