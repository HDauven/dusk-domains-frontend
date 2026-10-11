import type { AppRoute } from '../../../app/routes'
import { auctionStatus, auctionStatusLabel, isExpired } from '../../marketplace/marketplacePresentation'
import { formatLuxNumberAsDusk } from '../../treasury/feeConfig'
import { formatLifecycleDay } from '../domainFormat'
import type { HeldListing, HeldSubname } from '../myDomainsData'

export function listingRoute(item: Pick<HeldListing, 'kind' | 'name' | 'node'>): AppRoute {
  return item.kind === 'auction' ? { view: 'marketplace', auctionNode: item.node } : { view: 'marketplace', listingName: item.name }
}

// What the market is doing with the name, in the words the market uses.
export function listingStatus(item: HeldListing, currentBlockHeight: number | null) {
  if (item.listing.returnPending) return `${item.kind === 'auction' ? 'Auction' : 'Sale'} cancelled · return the name to finish`
  if (item.kind === 'fixed') {
    if (isExpired(item.listing.expiresAtBlockHeight, currentBlockHeight)) return 'Listing expired · close it to get the name back'
    return `For sale${item.listing.privateBuyer ? ' to one buyer' : ''} · ${formatLuxNumberAsDusk(item.listing.priceLux)}`
  }
  const status = auctionStatus(item.listing, currentBlockHeight)
  if (status === 'waiting') return `In auction · minimum bid ${formatLuxNumberAsDusk(item.listing.reservePriceLux)}`
  if ((status === 'live' || status === 'ending') && item.listing.highestBid) return `In auction · current bid ${formatLuxNumberAsDusk(item.listing.highestBid.amountLux)}`
  if (status === 'expired') return 'No bids · close it to get the name back'
  return auctionStatusLabel(status)
}

export function subnameExpiry(item: Pick<HeldSubname, 'expiresAtBlockHeight'>, currentBlockHeight: number | null) {
  if (item.expiresAtBlockHeight === null || currentBlockHeight === null) return ''
  return `Expires ${formatLifecycleDay(item.expiresAtBlockHeight, currentBlockHeight, Math.floor(Date.now() / 1000))}`
}
