import { marketplaceOrderKey } from './orderIdentity'
import type { DuskDomainsIndexerClient } from '../../names/internal'

export type MarketplaceCursors = { fixedSales: string | null; auctions: string | null; offers: string | null }

export async function readMarketplacePage(client: DuskDomainsIndexerClient, cursors?: MarketplaceCursors) {
  const [fixedSales, auctions, offers] = await Promise.all([
    cursors && !cursors.fixedSales ? { fixedSales: [], nextCursor: null } : client.getMarketplaceFixedSalesPage({ cursor: cursors?.fixedSales ?? undefined }),
    cursors && !cursors.auctions ? { auctions: [], nextCursor: null } : client.getMarketplaceAuctionsPage({ cursor: cursors?.auctions ?? undefined }),
    cursors && !cursors.offers ? { offers: [], nextCursor: null } : client.getMarketplaceOffersPage({ cursor: cursors?.offers ?? undefined }),
  ])
  return {
    fixedSales: fixedSales.fixedSales, auctions: auctions.auctions, offers: offers.offers,
    cursors: { fixedSales: fixedSales.nextCursor, auctions: auctions.nextCursor, offers: offers.nextCursor },
  }
}

export function appendPage<T>(current: T[], incoming: T[], key: (item: T) => string) {
  return [...new Map([...current, ...incoming].map((item) => [key(item), item])).values()]
}

// Refresh the loaded window so background updates do not discard later pages.
export async function readMarketplaceWindow(client: DuskDomainsIndexerClient, pages: number) {
  const result = await readMarketplacePage(client)
  for (let page = 1; page < pages && Object.values(result.cursors).some(Boolean); page++) {
    const next = await readMarketplacePage(client, result.cursors)
    result.fixedSales = appendPage(result.fixedSales, next.fixedSales, marketplaceOrderKey)
    result.auctions = appendPage(result.auctions, next.auctions, marketplaceOrderKey)
    result.offers = appendPage(result.offers, next.offers, marketplaceOrderKey)
    result.cursors = next.cursors
  }
  return result
}
