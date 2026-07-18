import { describe, expect, it, vi } from 'vitest'
import type {
  DuskDomainsMarketplaceOnChainClient,
  DuskDomainsOnChainClient,
  IndexedMarketplaceAuction,
  IndexedMarketplaceFixedSale,
  IndexedMarketplaceOffer,
  IndexedNameSummary,
} from '../../names/internal'
import {
  canonicalAuction,
  canonicalFixedSale,
  canonicalOffer,
  canonicalOfferAbsent,
  canonicalOfferTarget,
  canonicalOwnedName,
  minimumCanonicalBidLux,
} from './canonicalMarketplaceState'

const node = `0x${'11'.repeat(32)}`
const authority = `0x${'22'.repeat(32)}`

describe('canonical marketplace signing state', () => {
  it('accepts matching canonical sale state', async () => {
    const client = clientWith({
      getFixedSale: vi.fn(async () => ({ ok: true, value: {
        node, name: 'example.dusk', sellerAuthority: authority, priceLux: 10n,
        privateBuyer: null, expiresAtBlock: 200, domainExpiresAtBlock: 300,
      } })),
    })
    const indexed = {
      node, name: 'example.dusk', sellerAuthority: authority, priceLux: 10, privateBuyer: null,
      expiresAtBlockHeight: 200,
    } as IndexedMarketplaceFixedSale
    await expect(canonicalFixedSale(client, indexed)).resolves.toMatchObject({ priceLux: 10n })
  })

  it('blocks a stale indexed price before wallet submission', async () => {
    const client = clientWith({
      getFixedSale: vi.fn(async () => ({ ok: true, value: {
        node, name: 'example.dusk', sellerAuthority: authority, priceLux: 11n,
        privateBuyer: null, expiresAtBlock: 200, domainExpiresAtBlock: 300,
      } })),
    })
    const indexed = {
      node, name: 'example.dusk', sellerAuthority: authority, priceLux: 10,
      privateBuyer: null, expiresAtBlockHeight: 200,
    } as IndexedMarketplaceFixedSale
    await expect(canonicalFixedSale(client, indexed)).rejects.toThrow('changed on-chain')
  })

  it('blocks absent auctions and calculates the rounded five-percent minimum', async () => {
    const client = clientWith({ getAuction: vi.fn(async () => ({ ok: true, value: null })) })
    await expect(canonicalAuction(client, { node } as IndexedMarketplaceAuction)).rejects.toThrow('changed on-chain')
    expect(minimumCanonicalBidLux({ reservePriceLux: 10n, highestBid: { amountLux: 101n } } as never)).toBe(107n)
  })

  it('requires the canonical active owner before a listing enters escrow', async () => {
    const indexed = {
      node,
      canonicalName: 'example.dusk',
    } as IndexedNameSummary
    const client = coreClientWith({
      getName: vi.fn(async () => ({ ok: true, value: {
        canonicalName: 'example.dusk',
        marketplaceTransferable: true,
        node,
        record: {
          label: 'example',
          owner: authority,
          manager: authority,
          lifecycle: { expiresAtBlock: 500, graceEndsAtBlock: 600 },
          referrer: null,
        },
      } })),
    })

    await expect(canonicalOwnedName(client, indexed, authority)).resolves.toMatchObject({
      node,
      currentBlockHeight: 400,
    })
    await expect(canonicalOwnedName(client, indexed, `0x${'33'.repeat(32)}`)).rejects.toThrow('changed on-chain')

    const expired = coreClientWith({
      getCurrentBlockHeight: vi.fn(async () => ({ ok: true, value: 500 })),
      getName: client.getName,
    })
    await expect(canonicalOwnedName(expired, indexed, authority)).rejects.toThrow('changed on-chain')
  })

  it('requires an active canonical target owned by somebody else before placing an offer', async () => {
    const targetOwner = `0x${'44'.repeat(32)}`
    const target = coreClientWith({
      getName: vi.fn(async () => ({ ok: true, value: {
        canonicalName: 'example.dusk',
        marketplaceTransferable: true,
        node,
        record: {
          label: 'example',
          owner: targetOwner,
          manager: targetOwner,
          lifecycle: { expiresAtBlock: 500, graceEndsAtBlock: 600 },
          referrer: null,
        },
      } })),
    })

    await expect(canonicalOfferTarget(target, 'example.dusk', node, authority)).resolves.toMatchObject({
      node,
      currentBlockHeight: 400,
    })
    await expect(canonicalOfferTarget(target, 'example.dusk', node, targetOwner)).rejects.toThrow('changed on-chain')

    const expired = coreClientWith({
      getCurrentBlockHeight: vi.fn(async () => ({ ok: true, value: 500 })),
      getName: target.getName,
    })
    await expect(canonicalOfferTarget(expired, 'example.dusk', node, authority)).rejects.toThrow('changed on-chain')
  })

  it('identifies an unregistered offer target before applying transfer restrictions', async () => {
    const missing = coreClientWith({
      getName: vi.fn(async () => ({ ok: true, value: {
        canonicalName: 'testnet.dusk',
        marketplaceTransferable: false,
        node,
        record: null,
      } })),
    })

    await expect(canonicalOfferTarget(missing, 'testnet.dusk', node, authority))
      .rejects.toThrow('testnet.dusk is not registered on this network')
  })

  it('blocks listings and offers for subnames or roots with subdomains', async () => {
    const indexed = { node, canonicalName: 'example.dusk' } as IndexedNameSummary
    const encumbered = coreClientWith({
      getName: vi.fn(async () => ({ ok: true, value: {
        canonicalName: 'example.dusk',
        marketplaceTransferable: false,
        node,
        record: {
          label: 'example',
          owner: authority,
          manager: authority,
          lifecycle: { expiresAtBlock: 500, graceEndsAtBlock: 600 },
          referrer: null,
        },
      } })),
    })

    await expect(canonicalOwnedName(encumbered, indexed, authority)).rejects.toThrow('without subdomains')
    await expect(canonicalOfferTarget(encumbered, 'example.dusk', node, `0x${'33'.repeat(32)}`))
      .rejects.toThrow('without subdomains')
  })

  it('blocks stale or absent offers before cancellation or expiry', async () => {
    const indexed = {
      node,
      buyerAuthority: authority,
      amountLux: 10,
      expiresAtBlockHeight: 200,
    } as IndexedMarketplaceOffer
    const absent = clientWith({ getOffer: vi.fn(async () => ({ ok: true, value: null })) })
    await expect(canonicalOffer(absent, indexed)).rejects.toThrow('changed on-chain')

    const changed = clientWith({ getOffer: vi.fn(async () => ({ ok: true, value: {
      node,
      buyerAuthority: authority,
      amountLux: 11n,
      expiresAtBlock: 200,
    } })) })
    await expect(canonicalOffer(changed, indexed)).rejects.toThrow('changed on-chain')
  })

  it('requires the connected buyer offer key to be empty before placement', async () => {
    const empty = clientWith({ getOffer: vi.fn(async () => ({ ok: true, value: null })) })
    await expect(canonicalOfferAbsent(empty, node, authority)).resolves.toBeUndefined()

    const occupied = clientWith({ getOffer: vi.fn(async () => ({ ok: true, value: {
      node,
      buyerAuthority: authority,
      amountLux: 10n,
      expiresAtBlock: 200,
    } })) })
    await expect(canonicalOfferAbsent(occupied, node, authority)).rejects.toThrow('changed on-chain')
  })
})

function clientWith(overrides: Partial<DuskDomainsMarketplaceOnChainClient>): DuskDomainsMarketplaceOnChainClient {
  const missing = async () => ({ ok: true as const, value: null })
  return {
    getFixedSale: missing,
    getAuction: missing,
    getOffer: missing,
    getRefund: missing,
    ...overrides,
  }
}

function coreClientWith(overrides: Partial<DuskDomainsOnChainClient>): DuskDomainsOnChainClient {
  return {
    getCurrentBlockHeight: vi.fn(async () => ({ ok: true, value: 400 })),
    ...overrides,
  } as DuskDomainsOnChainClient
}
