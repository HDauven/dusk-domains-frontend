import { expect, it, vi } from 'vitest'
import { appendPage, readMarketplacePage } from './marketplacePages'

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
