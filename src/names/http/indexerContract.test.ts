// Checks a running indexer against what this site reads. Skipped unless an indexer is named:
//   DUSK_DOMAINS_TEST_INDEXER_URL=http://127.0.0.1:8810 npx vitest run src/names/http/indexerContract.test.ts
// With DUSK_DOMAINS_TEST_DEPLOYMENT='{"chainId":"dusk:1","contracts":{"directory":"0x…",…}}' the
// indexer must also report that deployment.
import { beforeEach, describe, expect, it } from 'vitest'
import { indexerDeploymentMismatch, indexerReadable, staleIndexerData } from '../../app/indexerIdentity'
import { createHealthyIndexerClient } from '../../app/indexerReadHelpers'
import { indexerFreshness } from '../../app/networkFreshness'
import { marketTakesNewOrders } from '../../features/marketplace/marketAvailability'
import type { DuskDomainsRuntimeConfig } from '../config'
import { ALL_MARKETPLACES, createDuskDomainsIndexerClient } from './client'

const baseUrl = process.env.DUSK_DOMAINS_TEST_INDEXER_URL ?? ''
const deployment = process.env.DUSK_DOMAINS_TEST_DEPLOYMENT
  ? JSON.parse(process.env.DUSK_DOMAINS_TEST_DEPLOYMENT) as { chainId: string; contracts: Record<string, string> }
  : null
const expected = deployment ? {
  chainId: deployment.chainId,
  contracts: Object.fromEntries(Object.entries(deployment.contracts).map(([role, contractId]) => [role, { contractId }])),
} as unknown as Pick<DuskDomainsRuntimeConfig, 'chainId' | 'contracts'> : undefined
const isContractId = (value: unknown) => typeof value === 'string' && /^0x[0-9a-f]{64}$/.test(value)

describe.skipIf(!baseUrl)('the indexer this site reads', () => {
  // Built in each test: a skipped suite still collects, without an indexer to name.
  let client: ReturnType<typeof createDuskDomainsIndexerClient>
  beforeEach(() => { client = createDuskDomainsIndexerClient({ baseUrl }) })

  it('serves /health this site parses, and only data it may show', async () => {
    const health = await client.getHealth()
    if (expected) expect(indexerDeploymentMismatch(health, expected)).toBeNull()
    const stale = staleIndexerData(health)
    if (health.degradedReason?.code === 'collector_blocked' && !health.warnings?.length) {
      expect(stale).toEqual({ code: 'collector_blocked', blockHeight: health.projectionBlockHeight })
      expect(indexerFreshness(health, Date.now())).toContain(`stopped updating at block ${health.projectionBlockHeight}`)
    }
    // Events set aside from unauthenticated markets leave a healthy indexer live.
    if (health.ok && Object.keys(health.collector?.quarantine ?? {}).length) {
      expect(stale).toBeNull()
      expect(indexerFreshness(health, Date.now()) ?? '').not.toContain('stopped updating')
    }
    // Reads go through only while the indexer is healthy or serves its last complete publication.
    const reads = createHealthyIndexerClient(baseUrl, expected)
    const names = reads.getNamesPage({ limit: 1 })
    if (indexerReadable(await reads.getHealth())) await expect(names).resolves.toHaveProperty('names')
    else await expect(names).rejects.toThrow()
  })

  it('serves a market config with a fee or none, never a default, and every market', async () => {
    const config = await client.getMarketplaceConfig()
    if (config.feeBps === null) expect(config).toMatchObject({ initialized: false, tradingPaused: true })
    else expect(Number.isInteger(config.feeBps)).toBe(true)
    const raw = await (await fetch(`${baseUrl}/marketplace/config`)).json() as { marketplaces?: unknown[] }
    expect(config.marketplaces).toHaveLength(raw.marketplaces?.length ?? 0)
    for (const market of config.marketplaces ?? []) {
      expect(isContractId(market.marketplaceContractId)).toBe(true)
      if (market.feeBps === null || market.state !== 'Listed') expect(market.tradingPaused).toBe(true)
      if (market.authenticated === false) {
        expect(market).toMatchObject({ feeBps: null, tradingPaused: true, unsettledOrders: null, refundAccounts: null, refundableLux: null, holdsObligations: null })
        expect(marketTakesNewOrders(market.marketplaceContractId, { marketplaces: config.marketplaces ?? [], preferred: config.marketplaceContractId, tradingPaused: config.tradingPaused })).toBe(false)
      }
    }
    await expect(client.getMarketplaceConfig({ marketplace: ALL_MARKETPLACES })).rejects.toThrow()
  })

  it('lists every market’s orders and an account’s refunds, each naming its market', async () => {
    const scope = { marketplace: ALL_MARKETPLACES }
    const [sales, auctions, offers, config] = await Promise.all([
      client.getAllMarketplaceFixedSales(undefined, scope),
      client.getAllMarketplaceAuctions(undefined, scope),
      client.getMarketplaceOffersPage(scope),
      client.getMarketplaceConfig(),
    ])
    // Nothing of a market the indexer hasn't authenticated is served.
    const unauthenticated = new Set((config.marketplaces ?? []).filter(market => market.authenticated === false).map(market => market.marketplaceContractId))
    // Every order carries the market and order it is acted on at.
    for (const order of [...sales, ...auctions, ...offers.offers]) {
      expect(isContractId(order.marketplaceContractId)).toBe(true)
      expect(order.order).toBeTruthy()
      expect(unauthenticated.has(order.marketplaceContractId!)).toBe(false)
    }
    for (const buyer of new Set(offers.offers.map(offer => offer.buyerAuthority))) {
      for (const refund of await client.getAllMarketplaceRefunds(buyer)) {
        expect(isContractId(refund.marketplaceContractId)).toBe(true)
        expect(unauthenticated.has(refund.marketplaceContractId!)).toBe(false)
      }
    }
  })
})
