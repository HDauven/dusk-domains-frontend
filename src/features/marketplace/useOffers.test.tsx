import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { namehashHex, type DuskDomainsMarketplaceOnChainClient, type DuskDomainsOnChainOffer, type DuskDomainsOnChainClient, type IndexedMarketplaceOffer, type IndexedNameSummary } from '../../names/internal'
import { useOffers } from './useOffers'
import { useMarketplaceWrites } from './useMarketplaceWrites'

const node = namehashHex('example.dusk')
const buyerAuthority = `0x${'22'.repeat(32)}`
const seller = `0x${'33'.repeat(32)}`
const indexed = { node, name: 'example.dusk', buyerAuthority, amountLux: 10_000_000_000, feeBps: 250, expiresAtBlockHeight: 200 } as IndexedMarketplaceOffer

function setup(offer = { ...indexed }) {
  const live: DuskDomainsOnChainOffer = { node, buyerAuthority, amountLux: 10_000_000_000n, offerId: 7, feeBps: 250, expiresAtBlock: 200 }
  const marketplaceOnChainClient: DuskDomainsMarketplaceOnChainClient = { getOffer: async () => ({ ok: true, value: live }), getFixedSale: async () => ({ ok: true, value: null }), getAuction: async () => ({ ok: true, value: null }), getRefund: async () => ({ ok: true, value: null }) }
  let confirm: (() => Promise<unknown>) | undefined
  const submit = vi.fn(async () => null)
  const setError = vi.fn()
  const requestReview = vi.fn((_details, callback: () => Promise<unknown>) => { confirm = callback })
  let feature: ReturnType<typeof useOffers>
  function Probe() {
    const writes = useMarketplaceWrites({
      marketplaceOnChainClient, runtimeConfig: { contracts: {} }, feedbackScope: 'offers',
      feedback: { setError, setConfirmation: vi.fn(), setTxState: vi.fn() },
    } as never)
    feature = useOffers({
      marketplaceContractId: `0x${'44'.repeat(32)}`,
      marketplaceOnChainClient,
      duskDomainsOnChainClient: {
        getCurrentBlockHeight: async () => ({ ok: true, value: 100 }),
        getName: async () => ({ ok: true, value: { canonicalName: 'example.dusk', node, marketplaceTransferable: true, record: { label: 'example', referrer: null, owner: seller, manager: seller, lifecycle: { expiresAtBlock: 300, graceEndsAtBlock: 400 } } } }),
      } as unknown as DuskDomainsOnChainClient,
      ownedNames: [{ node, canonicalName: 'example.dusk' } as IndexedNameSummary],
      selectedAddress: 'seller-address', selectedAuthority: seller, setError,
      writes: { ...writes, submit, requestReview },
    })
    return null
  }
  renderToStaticMarkup(<Probe />)
  return { accept: () => feature.acceptOffer(offer), confirm: () => confirm!(), submit, setError, requestReview,
    cancel: () => feature.cancelOffer(offer), expire: () => feature.expireOffer(offer),
    change: (terms: Partial<DuskDomainsOnChainOffer>) => { Object.assign(live, terms) } }
}

describe('offer acceptance review', () => {
  it.each(['another.dusk', 'invalid name'])('rejects a mislabeled offer before review: %s', async name => {
    const h = setup({ ...indexed, name })
    await h.accept()
    expect(h.requestReview).not.toHaveBeenCalled()
    expect(h.submit).not.toHaveBeenCalled()
    expect(h.setError).toHaveBeenCalledWith('This offer does not match the displayed name. Refresh the offers before trying again.')
  })

  it('rechecks the displayed name when confirming an offer', async () => {
    const offer = { ...indexed }
    const h = setup(offer)
    await h.accept()
    expect(h.requestReview).toHaveBeenCalledOnce()
    offer.name = 'another.dusk'
    await h.confirm()
    expect(h.submit).not.toHaveBeenCalled()
    expect(h.setError).toHaveBeenCalledWith(expect.stringContaining('displayed name'))
  })

  it('signs the reviewed canonical placement, fee and gross amount', async () => {
    const h = setup()
    await h.accept()
    expect(h.requestReview).toHaveBeenCalledOnce()
    expect(h.submit).not.toHaveBeenCalled()
    await h.confirm()
    expect(h.submit).toHaveBeenCalledWith('accepting this offer', 'example.dusk', expect.objectContaining({ args: expect.objectContaining({ expectedOfferId: 7, expectedFeeBps: 250, expectedAmountLux: 10_000_000_000 }) }), 0n, expect.any(String))
  })

  it.each([{ offerId: 8 }, { feeBps: 1_000 }, { amountLux: 9_000_000_000n }])('blocks changed terms after review: %s', async (terms) => {
    const h = setup()
    await h.accept()
    h.change(terms)
    await h.confirm()
    expect(h.submit).not.toHaveBeenCalled()
    expect(h.setError).toHaveBeenCalledWith(expect.stringContaining('changed on-chain'))
  })

  it('rejects an indexed fee that differs from canonical state before review', async () => {
    const h = setup()
    h.change({ feeBps: 1_000 })
    await h.accept()
    expect(h.requestReview).not.toHaveBeenCalled()
    expect(h.submit).not.toHaveBeenCalled()
    expect(h.setError).toHaveBeenCalledWith(expect.stringContaining('changed on-chain'))
  })
})

describe.each(['cancel', 'expire'] as const)('%s offer', action => {
  it.each(['another.dusk', 'invalid name'])('rejects a mislabeled offer before submission: %s', async name => {
    const h = setup({ ...indexed, name })
    await h[action]()
    expect(h.submit).not.toHaveBeenCalled()
    expect(h.setError).toHaveBeenCalledWith('This offer does not match the displayed name. Refresh the offers before trying again.')
  })

  it('submits an offer with a matching displayed name', async () => {
    const h = setup()
    await h[action]()
    expect(h.setError).not.toHaveBeenCalled()
    expect(h.submit).toHaveBeenCalledExactlyOnceWith(expect.any(String), 'example.dusk', expect.objectContaining({ functionName: `${action}_offer_runtime`, args: expect.objectContaining({ node }) }), 0n, expect.any(String))
  })
})
