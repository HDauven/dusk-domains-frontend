// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { useMarketplaceData } from './useMarketplaceData'
import { useAuctions } from './useAuctions'
import { useOperatorPause } from '../../app/useOperatorPause'
import { useIndexerFreshness } from '../../app/useIndexerFreshness'
import type { IndexedMarketplaceAuction } from '../../names/internal'

const root = createRoot(document.createElement('div'))
const noop = () => {}
afterEach(async () => { await act(async () => root.render(null)); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

function setup() {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.useFakeTimers()
  const client = {
    getHealth: vi.fn(async () => ({ ok: true, currentBlockHeight: 100 })),
    getMarketplaceFixedSalesPage: vi.fn(async () => ({ fixedSales: [], nextCursor: null as string | null })),
    getMarketplaceAuctionsPage: vi.fn(async () => ({ auctions: [] as IndexedMarketplaceAuction[], nextCursor: null })),
    getMarketplaceOffersPage: vi.fn(async () => ({ offers: [], nextCursor: null })),
    getMarketplaceConfig: vi.fn(async () => ({ feeBps: 100 })),
    getAllNames: vi.fn(async () => []),
    getMarketplaceRefund: vi.fn(async () => null),
  }
  return client
}

it('refreshes listings every minute while staying below six idle reads per minute with a wallet', async () => {
  const client = setup()
  function Probe() {
    useOperatorPause(client as never, 'budget')
    useIndexerFreshness(client as never, false)
    useMarketplaceData({ indexerClient: client as never, accountScope: 'wallet', mainView: 'marketplace',
      selectedAddress: 'wallet', selectedAuthority: 'owner', setError: noop })
    return null
  }
  await act(async () => root.render(<Probe />))
  Object.values(client).forEach(method => method.mockClear())
  for (let minute = 1; minute <= 6; minute++) {
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
    expect(client.getMarketplaceAuctionsPage).toHaveBeenCalledTimes(minute)
  }
  expect(Object.values(client).reduce((sum, method) => sum + method.mock.calls.length, 0)).toBeLessThanOrEqual(36)
  expect(client.getMarketplaceConfig).toHaveBeenCalledTimes(2)
  expect(client.getAllNames).toHaveBeenCalledTimes(2)
  expect(client.getMarketplaceRefund).toHaveBeenCalledTimes(2)
})

it.each(['refresh', 'pagination'])('recovers a pending %s invalidated by a hidden wallet change', async kind => {
  const client = setup()
  client.getMarketplaceFixedSalesPage.mockResolvedValue({ fixedSales: [], nextCursor: 'next' })
  let visible = true
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visible ? 'visible' : 'hidden')
  let data: ReturnType<typeof useMarketplaceData>
  function Probe({ scope }: { scope: string }) {
    data = useMarketplaceData({ indexerClient: client as never, accountScope: scope, mainView: 'marketplace',
      selectedAddress: '', selectedAuthority: '', setError: noop })
    return null
  }
  await act(async () => root.render(<Probe scope="A" />))
  let release: (page: { fixedSales: never[]; nextCursor: string | null }) => void
  client.getMarketplaceFixedSalesPage.mockImplementationOnce(() => new Promise(resolve => { release = resolve }))
  let pending: Promise<void>
  await act(async () => { pending = kind === 'refresh' ? data.loadMarketplace(true) : data.loadMore() })
  expect(data!.loading).toBe(true)
  visible = false
  await act(async () => {
    document.dispatchEvent(new Event('visibilitychange'))
    root.render(<Probe scope="B" />)
  })
  await act(async () => { release({ fixedSales: [], nextCursor: null }); await pending })
  expect(data!.loading).toBe(false)
  expect(data!.hasMore).toBe(true)
  const reads = client.getMarketplaceFixedSalesPage.mock.calls.length
  visible = true
  await act(async () => document.dispatchEvent(new Event('visibilitychange')))
  expect(client.getMarketplaceFixedSalesPage).toHaveBeenCalledTimes(reads + 1)
  await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
  expect(client.getMarketplaceFixedSalesPage).toHaveBeenCalledTimes(reads + 2)
})

it.each([200, 90])('refreshes only the open auction and its activity every ten seconds (end %s)', async endBlockHeight => {
  const client = setup()
  const auction = { node: 'node', auctionId: 1, marketplaceContractId: 'market', name: 'alpha.dusk',
    reservePriceLux: 10e9, bidCount: 1, returnPending: false,
    startBlockHeight: endBlockHeight === null ? null : 50, endBlockHeight, startDeadlineBlockHeight: 200,
    highestBid: { bidderAuthority: 'viewer', amountLux: 10e9, placedAtBlockHeight: 50 },
  } as IndexedMarketplaceAuction
  const selection = 'node:market:1'
  client.getMarketplaceAuctionsPage.mockResolvedValue({ auctions: [auction], nextCursor: null })
  const changed = { ...auction, bidCount: 2, endBlockHeight: 260,
    highestBid: { bidderAuthority: 'other', amountLux: 20e9, placedAtBlockHeight: 100 } }
  const getMarketplaceAuction = vi.fn(async (): Promise<IndexedMarketplaceAuction | null> => changed)
  const getActivityPage = vi.fn(async () => ({ activity: [{ id: 'bid' }], nextCursor: null }))
  const indexerClient = { ...client, getMarketplaceAuction, getActivityPage }
  let visible = true
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visible ? 'visible' : 'hidden')
  let data: ReturnType<typeof useMarketplaceData>
  let bids: ReturnType<typeof useAuctions>
  function Probe({ selected = selection, mainView = 'marketplace' }) {
    data = useMarketplaceData({ indexerClient: indexerClient as never, accountScope: 'wallet', mainView,
      selectedAuctionNode: selected, selectedAddress: '', selectedAuthority: '', setError: noop })
    const args = { accountScope: 'wallet', marketScope: 'market', auctions: data.auctions,
      indexerClient: indexerClient as never, marketplaceOnChainClient: null,
      selectedAuthority: 'viewer', selectedAuctionNode: selected, setSelectedAuctionNode: noop,
      setConfirmation: noop, setError: noop, onBidPlaced: noop, writes: {} as never,
      refreshActivity: data.auctionPollingEnabled }
    bids = useAuctions(args)
    return null
  }
  await act(async () => root.render(<Probe />))
  getActivityPage.mockClear()
  await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
  expect(getMarketplaceAuction).toHaveBeenCalledExactlyOnceWith('node', { marketplace: 'market', orderId: '1' })
  expect(data!.auctions[0]).toMatchObject(changed)
  expect(getActivityPage).toHaveBeenCalledTimes(1)
  expect(bids!.auctionActivity).toEqual([{ id: 'bid' }])
  expect(client.getMarketplaceFixedSalesPage).toHaveBeenCalledTimes(1)
  getMarketplaceAuction.mockRejectedValueOnce(new Error('Unavailable'))
  await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
  expect(data!.readError).toBe("Couldn't refresh. Retrying…")
  expect(data!.auctions[0]).toMatchObject(changed)
  await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
  expect(data!.readError).toBe('')
  expect(getActivityPage).toHaveBeenCalledTimes(3)
  visible = false
  await act(async () => { document.dispatchEvent(new Event('visibilitychange')); await vi.advanceTimersByTimeAsync(30_000) })
  expect(getMarketplaceAuction).toHaveBeenCalledTimes(3)
  expect(getActivityPage).toHaveBeenCalledTimes(3)
  visible = true
  await act(async () => document.dispatchEvent(new Event('visibilitychange')))
  expect(getMarketplaceAuction).toHaveBeenCalledTimes(4)
  await act(async () => root.render(<Probe mainView="home" />))
  const reads = getActivityPage.mock.calls.length
  await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
  expect(getMarketplaceAuction).toHaveBeenCalledTimes(4)
  expect(getActivityPage).toHaveBeenCalledTimes(reads)
  await act(async () => root.render(<Probe />))
  getMarketplaceAuction.mockResolvedValue(null)
  await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
  expect(data!.auctions).toEqual([])
  const settledReads = getMarketplaceAuction.mock.calls.length
  await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
  expect(getMarketplaceAuction).toHaveBeenCalledTimes(settledReads)
  await act(async () => root.render(<Probe selected="" />))
})


it.each([false, true])('keeps an unstarted or return-pending auction detail within the idle budget (return %s)', async returnPending => {
  const client = setup()
  const auction = { node: 'node', startBlockHeight: null, endBlockHeight: null, startDeadlineBlockHeight: 200, returnPending } as IndexedMarketplaceAuction
  const getMarketplaceAuction = vi.fn(async () => auction)
  const indexerClient = { ...client, getMarketplaceAuction }
  let data: ReturnType<typeof useMarketplaceData>
  function Probe() {
    useOperatorPause(indexerClient as never, 'budget')
    useIndexerFreshness(indexerClient as never, false)
    data = useMarketplaceData({ indexerClient: indexerClient as never, accountScope: 'wallet', mainView: 'marketplace',
      selectedAuctionNode: 'node', selectedAddress: 'wallet', selectedAuthority: 'owner', setError: noop })
    return null
  }
  await act(async () => root.render(<Probe />))
  expect(data!.auctionPollingEnabled).toBe(false)
  Object.values(indexerClient).forEach(method => method.mockClear())
  await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
  expect(getMarketplaceAuction).not.toHaveBeenCalled()
  for (let minute = 0; minute < 6; minute++) {
    await act(async () => { await vi.advanceTimersByTimeAsync(minute === 0 ? 50_000 : 60_000) })
  }
  expect(Object.values(indexerClient).reduce((sum, method) => sum + method.mock.calls.length, 0)).toBeLessThanOrEqual(36)
})


it('loads auction activity after a hidden mount even when fast polling is disabled', async () => {
  setup()
  let visible = false
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visible ? 'visible' : 'hidden')
  const getActivityPage = vi.fn(async () => ({ activity: [{ id: 'bid' }], nextCursor: null }))
  const indexerClient = { getActivityPage }
  const auctions: IndexedMarketplaceAuction[] = []
  function Probe() {
    useAuctions({ accountScope: 'wallet', marketScope: 'market', auctions,
      indexerClient: indexerClient as never, marketplaceOnChainClient: null,
      selectedAuthority: 'viewer', selectedAuctionNode: 'node', setSelectedAuctionNode: noop,
      setConfirmation: noop, setError: noop, onBidPlaced: noop, writes: {} as never, refreshActivity: false })
    return null
  }
  await act(async () => root.render(<Probe />))
  expect(getActivityPage).not.toHaveBeenCalled()
  visible = true
  await act(async () => document.dispatchEvent(new Event('visibilitychange')))
  expect(getActivityPage).toHaveBeenCalledExactlyOnceWith('node', { cursor: undefined })
})
