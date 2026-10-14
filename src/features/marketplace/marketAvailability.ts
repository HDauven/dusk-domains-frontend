import { sameAuthority } from '../identity/ownerLabel'
import type { IndexedMarketplaceSummary } from '../../names/internal'

export const MARKET_FEE_UNKNOWN = 'This market’s fee can’t be read right now, so it isn’t taking new listings or offers. Try again later.'
export const MARKET_NOT_TAKING_BIDS = 'This auction’s market isn’t taking new bids. The auction can still be finalized or closed.'

/**
 * Whether a market takes new bids, by the indexer's summary of every admitted market: one that is
 * paused, unconfigured, unauthenticated, draining or retired doesn't, nor does one the summary
 * doesn't name. Before the summary has loaded, only the preferred market is open, unless trading
 * is paused. Preparing a bid reads the market's state from the chain again.
 */
export function marketTakesNewOrders(marketplaceContractId: string | null | undefined, { marketplaces, preferred, tradingPaused }: {
  marketplaces: readonly IndexedMarketplaceSummary[] | null
  preferred: string | null
  tradingPaused: boolean
}) {
  if (!marketplaceContractId) return false
  const isPreferred = sameAuthority(marketplaceContractId, preferred)
  if (tradingPaused && isPreferred) return false
  if (!marketplaces) return isPreferred
  const market = marketplaces.find(row => sameAuthority(row.marketplaceContractId, marketplaceContractId))
  return Boolean(market && market.authenticated !== false && !market.tradingPaused)
}
