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
