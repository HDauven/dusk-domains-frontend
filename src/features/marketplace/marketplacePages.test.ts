import { expect, it, vi } from 'vitest'
import { appendPage, readMarketplacePage, readMarketplaceWindow } from './marketplacePages'

it('loads first pages, then follows only the marketplace lists with remaining cursors', async () => {
  const client = {
    getMarketplaceFixedSalesPage: vi.fn(async () => ({ fixedSales: [{ node: 'sale' }], nextCursor: 'sales-next' })),
    getMarketplaceAuctionsPage: vi.fn(async () => ({ auctions: [], nextCursor: null })),
    getMarketplaceOffersPage: vi.fn(async () => ({ offers: [{ node: 'offer' }], nextCursor: 'offers-next' })),
  }
  const first = await readMarketplacePage(client as never)
  expect(first.cursors).toEqual({ fixedSales: 'sales-next', auctions: null, offers: 'offers-next' })
  const next = await readMarketplacePage(client as never, first.cursors)
  expect(next.auctions).toEqual([])
  expect(client.getMarketplaceAuctionsPage).toHaveBeenCalledTimes(1)
  expect(client.getMarketplaceFixedSalesPage).toHaveBeenLastCalledWith({ cursor: 'sales-next' })
  expect(client.getMarketplaceOffersPage).toHaveBeenLastCalledWith({ cursor: 'offers-next' })
})

it('merges overlapping pages by identity and keeps updated rows', () => {
  expect(appendPage([{ node: 'a', value: 1 }], [{ node: 'a', value: 2 }, { node: 'b', value: 3 }], (row) => row.node))
    .toEqual([{ node: 'a', value: 2 }, { node: 'b', value: 3 }])
})

it('refreshes loaded pages together without keeping removed orders', async () => {
  const client = {
    getMarketplaceFixedSalesPage: vi.fn(async ({ cursor }) => ({ fixedSales: [{ node: cursor ? 'second' : 'first' }], nextCursor: cursor ? null : 'more' })),
    getMarketplaceAuctionsPage: vi.fn(async () => ({ auctions: [], nextCursor: null })),
    getMarketplaceOffersPage: vi.fn(async () => ({ offers: [], nextCursor: null })),
  }
  const window = await readMarketplaceWindow(client as never, 2)
  expect(window.fixedSales.map((sale) => sale.node)).toEqual(['first', 'second'])
  expect(client.getMarketplaceAuctionsPage).toHaveBeenCalledTimes(1)
  expect(window.cursors.fixedSales).toBeNull()
})

it('retains old-shard orders alongside new orders for the same name and buyer', async () => {
  const old = { node: 'name', buyerAuthority: 'buyer', marketplaceContractId: 'market', order: { terms: { id: 1n, store: [1] } } }
  const current = { ...old, order: { terms: { id: 2n, store: [2] } } }
  const client = {
    getMarketplaceFixedSalesPage: vi.fn(async () => ({ fixedSales: [], nextCursor: null })),
    getMarketplaceAuctionsPage: vi.fn(async () => ({ auctions: [], nextCursor: null })),
    getMarketplaceOffersPage: vi.fn(async ({ cursor }) => ({ offers: [cursor ? current : old], nextCursor: cursor ? null : 'more' })),
  }
  const result = await readMarketplaceWindow(client as never, 2)
  expect(result.offers).toEqual([old, current])
})
