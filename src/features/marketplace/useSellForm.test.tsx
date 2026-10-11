// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { IndexedNameSummary } from '../../names/internal'
import { useSellForm } from './useSellForm'

vi.mock('./canonicalMarketplaceState', () => ({ canonicalOwnedName: vi.fn(async () => ({ currentBlockHeight: 100, ref: null })) }))

let root: Root
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  root = createRoot(document.createElement('div'))
})
afterEach(async () => { await act(async () => root.unmount()); vi.unstubAllGlobals() })

async function setup(status: string) {
  const name = { node: 'node', canonicalName: 'nachtvos.dusk', namespace: [] } as unknown as IndexedNameSummary
  const submit = vi.fn(async () => ({ status }))
  const requestReview = vi.fn()
  let form: ReturnType<typeof useSellForm>
  function Probe() {
    form = useSellForm({ feeBps: 250, duskDomainsOnChainClient: {} as never, marketplaceContractId: 'market', onOpenWalletConnection: vi.fn(),
      selectedAddress: 'seller-address', selectedAuthority: 'seller', selectedName: name, setError: vi.fn(),
      writes: { submit, requestReview } as never })
    return null
  }
  await act(async () => { root.render(<Probe />) })
  await act(async () => { form.setFixedPriceDusk('30'); form.setReserveDusk('60'); form.setPrivateBuyer('') })
  return { submit, requestReview, form: () => form }
}

it('asks for a new price after a listing, so the next name is never listed at the last price', async () => {
  const h = await setup('executed')
  await act(async () => { await h.form().createListing(true) })
  expect(h.submit).toHaveBeenCalledOnce()
  expect(h.form().fixedPriceDusk).toBe('')
  expect(h.form().reserveDusk).toBe('')
})

it('says in the listing review how the name comes back from escrow', async () => {
  const h = await setup('executed')
  await act(async () => { await h.form().createListing() })
  // Cancelling or closing a listing leaves the name in escrow until it is returned.
  expect(h.requestReview.mock.calls[0][0].note).toBe('Proceeds use the current marketplace fee. The name stays in escrow until it sells. To get it back, cancel the listing, or close it once it expires, then return the name to your wallet.')
})

it('keeps the price when the listing did not go through', async () => {
  const h = await setup('failed')
  await act(async () => { await h.form().createListing(true) })
  expect(h.form().fixedPriceDusk).toBe('30')
})

it('says in the auction review when the timer starts, what happens without bids and how it is finalized', async () => {
  const h = await setup('executed')
  await act(async () => { h.form().setSaleMode('auction') })
  await act(async () => { await h.form().createListing() })
  const review = h.requestReview.mock.calls[0][0]
  expect(review.title).toBe('List nachtvos.dusk for auction')
  // Closing an auction ends it; the name comes back only when it is returned (`expire_order`, then `retry_return`).
  // The review must still fit a phone screen (scripts/marketplace-ux-smoke.mjs).
  expect(review.note).toBe('Proceeds are shown at the minimum bid and the current fee. You can cancel before the first bid, which starts the timer; bids in its last 10 minutes extend it. If nobody bids within 7 days, the auction can be closed and the name returned to you. Otherwise the name stays in escrow until anyone finalizes the auction within a day of its end, or later closes it and returns the name.')
  await act(async () => { await h.form().createListing(true) })
  expect(h.submit).toHaveBeenLastCalledWith('creating this auction', 'nachtvos.dusk', expect.anything(), 'Listed for auction. The first bid starts the timer.')
})
