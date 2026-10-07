import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { useFixedSales } from './useFixedSales'
import type { DuskDomainsOnChainFixedSale, IndexedMarketplaceFixedSale } from '../../names/internal'

function setup() {
  const sale = { saleId: 7, node: 'node', name: 'example.dusk', sellerAuthority: 'seller', priceLux: 10_000_000_000, feeBps: 250, privateBuyer: null, expiresAtBlockHeight: 200, openedAtBlockHeight: 100 } as IndexedMarketplaceFixedSale
  const live: DuskDomainsOnChainFixedSale = { ...sale, priceLux: 10_000_000_000n, expiresAtBlock: 200, domainExpiresAtBlock: 300 }
  const submit = vi.fn(async () => null)
  const setError = vi.fn()
  let confirm: () => Promise<unknown>
  let feature: ReturnType<typeof useFixedSales>
  const client = { getFixedSale: async () => ({ ok: true, value: { ...live } }) }
  const requestReview = vi.fn((_review, next: () => Promise<unknown>) => { confirm = next })
  function Probe() {
    feature = useFixedSales({ marketplaceOnChainClient: client as never, selectedAddress: 'address', selectedAuthority: 'buyer', setError,
      writes: { submit, requestReview, guardCanonicalRead: async (read: (c: unknown) => Promise<unknown>) => { await read(client); return true } } as never,
    })
    return null
  }
  renderToStaticMarkup(<Probe />)
  return { sale, live, submit, setError, requestReview, feature: () => feature, confirm: () => confirm() }
}

it('binds a fixed-price purchase to the reviewed sale', async () => {
  const h = setup()
  await h.feature().buyFixedSale(h.sale)
  await h.confirm()
  expect(h.submit).toHaveBeenCalledWith('buying this name', 'example.dusk', expect.objectContaining({ args: {
    node: 'node', expectedSaleId: 7, priceLux: 10_000_000_000, buyerManager: 'buyer',
  } }), expect.any(String))
})

it.each([{ saleId: 8 }, { feeBps: 500 },])('rejects changed sale terms after review: %j', async changed => {
  const h = setup()
  await h.feature().buyFixedSale(h.sale)
  Object.assign(h.sale, changed)
  Object.assign(h.live, changed)
  await h.confirm()
  expect(h.submit).not.toHaveBeenCalled()
  expect(h.setError).toHaveBeenCalledWith(expect.stringContaining('changed on-chain'))
})

it.each(['cancelFixedSale', 'expireFixedSale'] as const)('binds %s to the reviewed sale', async action => {
  const h = setup()
  await h.feature()[action](h.sale)
  expect(h.submit).toHaveBeenCalledWith(expect.any(String), 'example.dusk', expect.objectContaining({ args: { node: 'node', expectedSaleId: 7 } }), expect.any(String))
})
