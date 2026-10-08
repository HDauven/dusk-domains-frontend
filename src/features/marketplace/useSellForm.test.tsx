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
  let form: ReturnType<typeof useSellForm>
  function Probe() {
    form = useSellForm({ feeBps: 250, duskDomainsOnChainClient: {} as never, marketplaceContractId: 'market', onOpenWalletConnection: vi.fn(),
      selectedAddress: 'seller-address', selectedAuthority: 'seller', selectedName: name, setError: vi.fn(),
      writes: { submit, requestReview: vi.fn() } as never })
    return null
  }
  await act(async () => { root.render(<Probe />) })
  await act(async () => { form.setFixedPriceDusk('30'); form.setReserveDusk('60'); form.setPrivateBuyer('') })
  return { submit, form: () => form }
}

it('asks for a new price after a listing, so the next name is never listed at the last price', async () => {
  const h = await setup('executed')
  await act(async () => { await h.form().createListing(true) })
  expect(h.submit).toHaveBeenCalledOnce()
  expect(h.form().fixedPriceDusk).toBe('')
  expect(h.form().reserveDusk).toBe('')
})

it('keeps the price when the listing did not go through', async () => {
  const h = await setup('failed')
  await act(async () => { await h.form().createListing(true) })
  expect(h.form().fixedPriceDusk).toBe('30')
})
