// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { namehashHex, type IndexedMarketplaceAuction, type IndexedMarketplaceFixedSale } from '../../names/internal'
import { NameHeader } from '../search/NameHeader'
import { SearchResultOverview } from '../search/SearchResultOverview'
import { nameListingOffer } from './nameListing'
import { useNameListing } from './useNameListing'

const seller = `0x${'22'.repeat(32)}`
const node = namehashHex('marrowfen.dusk')
const fixed = (extra: Partial<IndexedMarketplaceFixedSale> = {}) => ({ node, name: 'marrowfen.dusk', sellerAuthority: seller, priceLux: 30_000_000_000,
  privateBuyer: null, expiresAtBlockHeight: 2_000, saleId: 2, marketplaceContractId: `0x${'05'.repeat(32)}`, escrowed: true, ...extra }) as IndexedMarketplaceFixedSale
const auction = (extra: Partial<IndexedMarketplaceAuction> = {}) => ({ node, name: 'marrowfen.dusk', sellerAuthority: seller, reservePriceLux: 60_000_000_000,
  highestBid: null, bidCount: 0, startBlockHeight: null, endBlockHeight: null, startDeadlineBlockHeight: 9_000, auctionId: 3, escrowed: true, ...extra }) as IndexedMarketplaceAuction

afterEach(() => vi.unstubAllGlobals())

describe('names for sale', () => {
  it('says what a listed name costs and where to buy or bid', () => {
    expect(nameListingOffer({ kind: 'fixed', name: 'marrowfen.dusk', node, listing: fixed() }, 1_000, '')).toEqual({
      text: 'For sale · 30 DUSK', linkLabel: 'Buy in the market', route: { view: 'marketplace', listingName: 'marrowfen.dusk' } })
    expect(nameListingOffer({ kind: 'fixed', name: 'marrowfen.dusk', node, listing: fixed() }, 1_000, seller)?.linkLabel).toBe('View your listing')
    expect(nameListingOffer({ kind: 'fixed', name: 'marrowfen.dusk', node, listing: fixed({ privateBuyer: `0x${'33'.repeat(32)}` }) }, 1_000, '')?.text).toBe('For sale to one buyer · 30 DUSK')
    expect(nameListingOffer({ kind: 'auction', name: 'marrowfen.dusk', node, listing: auction() }, 1_000, '')).toEqual({
      text: 'In auction · minimum bid 60 DUSK', linkLabel: 'View auction', route: { view: 'marketplace', auctionNode: node } })
    expect(nameListingOffer({ kind: 'auction', name: 'marrowfen.dusk', node, listing: auction({ highestBid: { bidderAuthority: 'b', amountLux: 66_000_000_000, placedAtBlockHeight: 1 }, bidCount: 1, startBlockHeight: 10, endBlockHeight: 9_000 }) }, 1_000, '')?.text)
      .toBe('In auction · current bid 66 DUSK')
    // Nothing to buy: cancelled and waiting to return, or past its expiry.
    expect(nameListingOffer({ kind: 'fixed', name: 'marrowfen.dusk', node, listing: fixed({ returnPending: true }) }, 1_000, '')).toBeNull()
    expect(nameListingOffer({ kind: 'fixed', name: 'marrowfen.dusk', node, listing: fixed() }, 2_000, '')).toBeNull()
    expect(nameListingOffer(null, 1_000, '')).toBeNull()
  })

  it('shows the price and the market link on the name page and in the taken result', () => {
    const offer = nameListingOffer({ kind: 'fixed', name: 'marrowfen.dusk', node, listing: fixed() }, 1_000, '')!
    const header = renderToStaticMarkup(<NameHeader displayName="marrowfen.dusk" lifecycleLabel={null} primaryVerified={false} records={[]} reserved={false}
      status="registered" owner={`0x${'05'.repeat(32)}`} listing={offer} heldByMarket />)
    expect(header).toContain('For sale · 30 DUSK')
    expect(header).toContain('href="/market/listing/marrowfen.dusk"')
    expect(header).toContain('Buy in the market')
    expect(header).toContain('Held by the market while listed')
    expect(header).not.toContain('Owner ID')
    const taken = renderToStaticMarkup(<SearchResultOverview canRegister={false} displayName="marrowfen.dusk" onContinueRegistration={vi.fn()} onViewDetails={vi.fn()}
      resultIssues={[]} resultStatus="registered" listing={offer} quote={{ duration: 1, expiryDate: '', feeConfigLoading: false, onDurationChange: vi.fn(), registrationFee: 10 }}
      reservation={{ onOpenPendingReservation: vi.fn(), onOpenPendingReservations: vi.fn(), savedReservation: null, savedReservationWindow: null }} />)
    expect(taken).toContain('For sale · 30 DUSK')
    expect(taken).toContain('href="/market/listing/marrowfen.dusk"')
  })

  it('reads the listing only for a name the market holds', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    const client = { getMarketplaceFixedSale: vi.fn(async () => fixed()), getMarketplaceAuction: vi.fn(async () => null) }
    let listing: ReturnType<typeof useNameListing> = null
    function Probe({ escrowed }: { escrowed: boolean }) { listing = useNameListing({ indexerClient: client as never, node, escrowed }); return null }
    const root = createRoot(document.createElement('div'))
    await act(async () => root.render(<Probe escrowed={false} />))
    expect(client.getMarketplaceFixedSale).not.toHaveBeenCalled()
    await act(async () => root.render(<Probe escrowed />))
    await vi.waitFor(() => expect(listing).toMatchObject({ kind: 'fixed', name: 'marrowfen.dusk' }))
    expect(client.getMarketplaceAuction).toHaveBeenCalledWith(node)
    await act(async () => root.unmount())
  })
})
