import assert from 'node:assert/strict'

// Exercise the frontend's real read hooks with local HTTP fixtures and count SDK fetches.
export async function checkIndexerSessionBudget(page) {
  await page.evaluate(async () => {
    const { React, root } = window
    const { createHealthyIndexerClient } = await import('/src/app/indexerReadHelpers.ts')
    const { useSkyNames } = await import('/src/app/useSkyNames.ts')
    const { useFeeConfig } = await import('/src/features/treasury/useFeeConfig.ts')
    const { useMarketplaceData } = await import('/src/features/marketplace/useMarketplaceData.ts')
    const { readIndexedName } = await import('/src/features/search/indexedNameReads.ts')
    const { safeNamehashHex } = await import('/src/features/domains/domainFormat.ts')
    const { DEFAULT_FEE_CONFIG } = await import('/src/names/internal.ts')
    const calls = []
    const realFetch = window.fetch
    const parent = 'parent.dusk'
    const parentNode = safeNamehashHex(parent)
    const nameRow = { node: parentNode, canonicalName: parent, owner: 'owner', manager: null, resolverId: null,
      expiresAt: null, graceEndsAt: null, status: 'active', lastEventType: 'name_registered', records: [],
      primaryName: null, primaryStatus: 'no_address', subnameCount: 20, activityCount: 0 }
    const health = { ok: true, generatedAt: '', source: 'test', mode: 'snapshot', currentBlockHeight: 100, routes: [], names: 1 }
    let childCount = 20
    window.fetch = async (input, init) => {
      const url = new URL(String(input), location.origin)
      if (!url.pathname.startsWith('/session-api/')) return realFetch(input, init)
      const route = url.pathname.slice('/session-api/'.length)
      calls.push(route)
      let body
      switch (route) {
        case 'health': body = health; break
        case 'fee-config': body = { ...DEFAULT_FEE_CONFIG, updatedAt: 0, operator: null, updatedAtBlockHeight: null, lastEventType: null, txId: null, blockHeight: null }; break
        case 'names': body = { names: url.searchParams.has('owner') ? [] : [nameRow], nextCursor: null }; break
        case 'search': {
          const name = url.searchParams.get('query')
          body = { canonical: name, canonicalRaw: name, displayName: name, label: name.split('.')[0], status: name === parent ? 'registered' : 'available', price: 50, issues: [], transactionBlocked: false }
          break
        }
        case 'resolve': {
          const name = url.searchParams.get('name')
          body = { canonicalName: name, node: safeNamehashHex(name), records: name === parent ? [{ key: 'moonlight_address', value: 'wallet' }] : [],
            resolver: {}, expiry: {}, cache: {}, warnings: [], errors: [], verificationStatus: 'unverified' }
          break
        }
        case 'name': body = url.searchParams.get('node') === parentNode ? nameRow : null; break
        case 'activity': body = { activity: [], nextCursor: null }; break
        case 'reverse': body = null; break
        case 'subnames': body = { subnames: url.searchParams.get('parentNode') === parentNode ? Array.from({ length: childCount }, (_, index) => ({
          parentNode, parentName: parent, node: `child-${index}`, name: `child${index}.${parent}`, label: `child${index}`,
          owner: 'owner', manager: 'owner', resolver: 'resolver', expiresAt: '', parentExpiresAt: '', expiryPolicy: 'inherits_parent',
          status: 'active', createdAt: '', lastEventType: 'subname_created', txId: null, blockHeight: 100,
        })) : [], nextCursor: null }; break
        case 'marketplace/refund': body = null; break
        case 'marketplace/fixed-sales':
        case 'marketplace/auctions':
        case 'marketplace/offers': {
          const field = { 'marketplace/fixed-sales': 'fixedSales', 'marketplace/auctions': 'auctions', 'marketplace/offers': 'offers' }[route]
          const cursor = Number(url.searchParams.get('cursor') ?? 0)
          body = { [field]: Array.from({ length: 50 }, (_, index) => ({
            node: `order-${cursor * 50 + index}`, name: `order${cursor * 50 + index}.dusk`, sellerAuthority: 'owner', buyerAuthority: 'buyer',
            priceLux: 100, amountLux: 100, feeBps: 100, expiresAtBlockHeight: 200, openedAtBlockHeight: 100, placedAtBlockHeight: 100,
            reservePriceLux: 100, durationBlocks: 100, startDeadlineBlockHeight: 200, startBlockHeight: null, endBlockHeight: null,
            highestBid: null, privateBuyer: null, marketplaceContractId: null, txId: null, bidCount: 0, createdAtBlockHeight: 100, escrowed: true,
            lastEventType: field === 'fixedSales' ? 'domain_fixed_sale_opened' : field === 'auctions' ? 'domain_auction_created' : 'domain_offer_placed',
          })), nextCursor: cursor < 2 ? String(cursor + 1) : null }
          break
        }
        default: throw new Error(`Unexpected indexer route: ${route}`)
      }
      return Response.json(body)
    }
    const client = createHealthyIndexerClient('/session-api')
    const noop = () => {}
    function Session({ view }) {
      const sky = useSkyNames(client)
      const fee = useFeeConfig(client)
      const market = useMarketplaceData({ accountScope: 'session', indexerClient: client, mainView: view, onLoaded: noop,
        selectedAddress: '24bfNr8MDUo5xJBecmeGzXDEraax4Cmbnhjyyt5GaL1Vbe6H48ZSYTpmjRDcFRDFzgzuePAPUNcdGMnBzBQBk4zAMgBCtPsY27tBJtKmB1st6qcmpzRR4Er5imxrzvMRnfWc',
        selectedAuthority: `0x${'11'.repeat(32)}`, setError: message => { window.sessionError = message } })
      window.sessionMarket = market
      return React.createElement('output', { id: 'session' }, JSON.stringify({ sky: sky.length, feeLoading: fee.feeConfigLoading, feeError: fee.feeConfigError }))
    }
    window.sessionCalls = calls
    window.renderSession = view => root.render(React.createElement(Session, { view }))
    window.readSessionName = async name => {
      const result = await client.searchName(name)
      await client.getHealth()
      const reads = await readIndexedName(client, result)
      if (reads.readErrors.length) throw new Error(reads.readErrors.join(', '))
      return Object.keys(reads.subnameRecordSets).length
    }
    window.readSixtyChildren = async () => { childCount = 60; return window.readSessionName(parent) }
    window.restoreSessionFetch = () => { window.fetch = realFetch }
    window.renderSession('home')
  })
  try {
    await page.waitForFunction(() => {
      const state = JSON.parse(document.querySelector('#session')?.textContent || '{}')
      return state.sky === 1 && !state.feeLoading && !state.feeError
    })
    const stages = { home: await page.evaluate(() => window.sessionCalls.length) }
    assert.equal(await page.evaluate(() => window.readSessionName('available.dusk')), 0)
    stages.search = await page.evaluate(() => window.sessionCalls.length)
    assert.equal(await page.evaluate(() => window.readSessionName('parent.dusk')), 20)
    stages.name = await page.evaluate(() => window.sessionCalls.length)
    await page.evaluate(() => window.renderSession('marketplace'))
    await page.waitForFunction(() => window.sessionMarket.auctions.length === 50 && !window.sessionMarket.loading)
    stages.marketplace = await page.evaluate(() => window.sessionCalls.length)
    for (const size of [100, 150]) {
      await page.evaluate(() => window.sessionMarket.loadMore())
      await page.waitForFunction(size => window.sessionMarket.auctions.length === size && !window.sessionMarket.loading, size)
    }
    stages.pagedTwice = await page.evaluate(() => window.sessionCalls.length)
    assert.equal(await page.evaluate(() => window.sessionError || ''), '')
    assert.deepEqual(stages, { home: 3, search: 9, name: 36, marketplace: 43, pagedTwice: 49 })
    const beforeSixty = stages.pagedTwice
    assert.equal(await page.evaluate(() => window.readSixtyChildren()), 60)
    assert.equal(await page.evaluate(() => window.sessionCalls.length) - beforeSixty, 67)
    console.log(`Indexer session requests: ${JSON.stringify(stages)}; 60-child search and hydration: 67`)
  } finally {
    await page.evaluate(() => window.restoreSessionFetch())
  }
}
