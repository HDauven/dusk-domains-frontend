import { useState } from 'react'
import type { IndexedMarketplaceAuction, IndexedMarketplaceFixedSale } from '../../names/internal'

type MarketFilter = 'all' | 'auction' | 'buy-now' | 'watching'
type MarketSort = 'ending' | 'recent' | 'price-low' | 'price-high'
type Order = { kind: 'auction'; value: IndexedMarketplaceAuction } | { kind: 'fixed'; value: IndexedMarketplaceFixedSale }

export function useMarketplaceBrowse(fixedSales: IndexedMarketplaceFixedSale[], auctions: IndexedMarketplaceAuction[], watchedNodes: string[]) {
  const [filter, setFilter] = useState<MarketFilter>('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<MarketSort>('ending')
  const watched = new Set(watchedNodes)
  const orders: Order[] = [
    ...fixedSales.map((value) => ({ kind: 'fixed' as const, value })),
    ...auctions.map((value) => ({ kind: 'auction' as const, value })),
  ]
  const results = orders.filter(({ kind, value }) => (
    value.name.toLowerCase().includes(query.trim().toLowerCase())
    && (filter !== 'watching' || watched.has(value.node))
    && (filter !== 'auction' || kind === 'auction')
    && (filter !== 'buy-now' || kind === 'fixed')
  )).sort((left, right) => orderValue(left, sort) - orderValue(right, sort))
  return { filter, setFilter, query, setQuery, sort, setSort, watched, results }
}

function orderValue({ kind, value }: Order, sort: MarketSort) {
  if (sort === 'recent') return -(kind === 'auction' ? value.createdAtBlockHeight : value.openedAtBlockHeight)
  if (sort === 'ending') return kind === 'auction' ? value.endBlockHeight ?? value.startDeadlineBlockHeight : value.expiresAtBlockHeight
  const price = kind === 'auction' ? value.highestBid?.amountLux ?? value.reservePriceLux : value.priceLux
  return sort === 'price-high' ? -price : price
}
