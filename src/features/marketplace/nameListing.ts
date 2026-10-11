import type { AppRoute } from '../../app/routes'
import type { HeldListing } from '../domains/myDomainsData'
import { listingRoute } from '../domains/my-domains/heldStatus'
import { formatLuxNumberAsDusk } from '../treasury/feeConfig'
import { auctionStatus, isExpired, sameAuthority } from './marketplacePresentation'

export type NameListingOffer = { text: string, linkLabel: string, route: AppRoute }

// A listed name's price and where to act on it, for its own page and its search result.
// Listings nobody can buy now (cancelled and waiting to return, or expired) show nothing.
export function nameListingOffer(item: HeldListing | null, currentBlockHeight: number | null, viewerAuthority: string): NameListingOffer | null {
  if (!item || item.listing.returnPending) return null
  const yours = sameAuthority(item.listing.sellerAuthority, viewerAuthority)
  const route = listingRoute(item)
  if (item.kind === 'fixed') {
    if (isExpired(item.listing.expiresAtBlockHeight, currentBlockHeight)) return null
    return {
      text: `For sale${item.listing.privateBuyer ? ' to one buyer' : ''} · ${formatLuxNumberAsDusk(item.listing.priceLux)}`,
      linkLabel: yours ? 'View your listing' : 'Buy in the market',
      route,
    }
  }
  const status = auctionStatus(item.listing, currentBlockHeight)
  const linkLabel = yours ? 'View your auction' : 'View auction'
  if (status === 'waiting') return { text: `In auction · minimum bid ${formatLuxNumberAsDusk(item.listing.reservePriceLux)}`, linkLabel, route }
  if ((status === 'live' || status === 'ending') && item.listing.highestBid) {
    return { text: `In auction · current bid ${formatLuxNumberAsDusk(item.listing.highestBid.amountLux)}`, linkLabel, route }
  }
  if (status === 'ended') return { text: 'Auction ended · finalization pending', linkLabel, route }
  return null
}
