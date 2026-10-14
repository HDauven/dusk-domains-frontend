import { expect, it } from 'vitest'
import type { HeldListing } from '../features/domains/myDomainsData'
import { reviewedListing } from './useHeldListing'

const market = `0x${'05'.repeat(32)}`
const held = (listing: HeldListing | null, heldByMarket = true) => ({ heldByMarket, listing })

it('binds a listed name’s renewal to the market and the order it is listed by', () => {
  expect(reviewedListing(held({ kind: 'fixed', name: 'a.dusk', node: 'n', listing: { marketplaceContractId: market, saleId: 3 } } as HeldListing))).toEqual({ marketplace: market, orderId: '3' })
  expect(reviewedListing(held({ kind: 'auction', name: 'a.dusk', node: 'n', listing: { marketplaceContractId: market, auctionId: 4, order: { terms: { id: 12n } } } } as HeldListing))).toEqual({ marketplace: market, orderId: '12' })
  // Nothing to bind to: no listing, a name no market holds, or a listing without its market.
  expect(reviewedListing(held(null))).toBeNull()
  expect(reviewedListing(held({ kind: 'fixed', name: 'a.dusk', node: 'n', listing: { marketplaceContractId: market, saleId: 3 } } as HeldListing, false))).toBeNull()
  expect(reviewedListing(held({ kind: 'fixed', name: 'a.dusk', node: 'n', listing: { marketplaceContractId: null, saleId: 3 } } as HeldListing))).toBeNull()
  expect(reviewedListing(undefined)).toBeNull()
})
