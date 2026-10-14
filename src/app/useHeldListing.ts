import { useNameListing } from '../features/marketplace/useNameListing'
import type { AppViewModelInputs } from './appViewTypes'
import { isMarketplaceEscrow } from './managedNameState'

/**
 * Whether a market holds the registered name shown, and the listing it holds it by. The name page
 * shows the listing; renewing a listed name is bound to it.
 */
export function useHeldListing({ appRuntime, domainState, namePreview }: Pick<AppViewModelInputs, 'appRuntime' | 'domainState' | 'namePreview'>) {
  const { managedName } = domainState
  const { nodeHex, result } = namePreview
  // The market holds a listed name as its owner.
  const knownMarkets = appRuntime.knownMarketplaces ?? appRuntime.runtimeConfig.contracts?.marketplace?.contractId ?? null
  const heldByMarket = result.status === 'registered' && managedName.node === nodeHex
    && Boolean(managedName.inMarketplaceEscrow ?? isMarketplaceEscrow(managedName, knownMarkets))
  const listing = useNameListing({ indexerClient: appRuntime.indexerClient, node: heldByMarket ? nodeHex : '', escrowed: heldByMarket })
  return { heldByMarket, listing }
}

export type HeldNameListing = ReturnType<typeof useHeldListing>

/** The market and order a listing is held by, as a renewal of the listed name binds them. */
export function reviewedListing(held: HeldNameListing | undefined) {
  const listing = held?.heldByMarket ? held.listing : null
  if (!listing?.listing.marketplaceContractId) return null
  const orderId = listing.listing.order?.terms.id ?? (listing.kind === 'fixed' ? listing.listing.saleId : listing.listing.auctionId)
  return { marketplace: listing.listing.marketplaceContractId, orderId: String(orderId) }
}
