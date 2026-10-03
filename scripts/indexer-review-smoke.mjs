import assert from 'node:assert/strict'

export async function checkInitialHydration(page) {
  await page.evaluate(async () => {
    const { React, root } = window
    const { useActivityFeed } = await import('/src/features/activity/useActivityFeed.ts')
    const { useIndexedNameHydration } = await import('/src/features/search/useIndexedNameHydration.ts')
    const { safeNamehashHex } = await import('/src/features/domains/domainFormat.ts')
    const client = {
      getHealth: async () => ({ ok: true, currentBlockHeight: 100 }),
      resolveForward: async () => ({ records: [] }), getNameState: async () => null,
      getAllSubnames: async () => [],
      getActivityPage: async node => {
        if (window.delayHydration) return new Promise(resolve => { window.finishHydration = resolve })
        return { activity: [{ id: node, node, eventType: 'registration', timestamp: '', blockHeight: 1 }], nextCursor: `next-${node}` }
      },
    }
    const noop = () => {}
    function Hydration({ name }) {
      const feed = useActivityFeed({ defaultName: name, defaultNode: safeNamehashHex(name), indexerClient: client, setError: noop })
      const hydration = useIndexedNameHydration({ ...feed, displayName: name, indexerClient: client,
        beginOwnershipRead: () => () => true,
        setCurrentBlockHeight: noop, setNowSeconds: noop, setResolverRecordSets: noop, setPrimaryEndpointValue: noop, setPrimaryName: noop, setConnectedPrimaryName: noop,
        setManagedName: noop, setDraftOwner: noop, setDraftManager: noop, setSubnameManager: noop, setSubnames: noop,
        setIndexerError: noop, setIndexerConfirmation: noop, setApiSearchResult: noop })
      window.hydrationFeed = feed
      window.hydrate = options => hydration.hydrateNameFromIndexer(client, { canonical: name }, () => true, options)
      return React.createElement('output', { id: 'hydration-name' }, name)
    }
    window.renderHydration = name => root.render(React.createElement(Hydration, { name }))
    window.renderHydration('one.dusk')
  })
  await page.getByText('one.dusk', { exact: true }).waitFor()
  await page.evaluate(() => { window.delayHydration = true; window.oldHydration = window.hydrate() })
  await page.waitForFunction(() => Boolean(window.finishHydration))
  await page.evaluate(() => { window.delayHydration = false; window.renderHydration('two.dusk') })
  await page.getByText('two.dusk', { exact: true }).waitFor()
  await page.evaluate(() => { window.nextHydration = window.hydrate() })
  await page.evaluate(async () => {
    window.finishHydration({ activity: [{ id: 'stale', eventType: 'registration', timestamp: '' }], nextCursor: null })
    await Promise.all([window.oldHydration, window.nextHydration])
  })
  await page.waitForTimeout(30)
  const current = await page.evaluate(() => window.hydrationFeed.activityEntries)
  assert.equal(current.length, 1)
  assert.notEqual(current[0].id, 'stale', 'Late initial hydration must not replace the current name activity')
  assert.equal(await page.evaluate(() => window.hydrationFeed.hasMoreActivity), true, 'Late hydration must not hide Load more')

  // A post-write refresh queues one read and invalidates its older initial hydration.
  await page.evaluate(() => { window.delayHydration = true; window.finishHydration = null; window.oldHydration = window.hydrate() })
  await page.waitForFunction(() => Boolean(window.finishHydration))
  await page.evaluate(() => { window.delayHydration = false; window.nextHydration = window.hydrate({ fresh: true }) })
  await page.evaluate(async () => {
    window.finishHydration({ activity: [{ id: 'stale', eventType: 'registration', timestamp: '' }], nextCursor: null })
    await Promise.all([window.oldHydration, window.nextHydration])
  })
  await page.waitForTimeout(30)
  assert.deepEqual(await page.evaluate(() => window.hydrationFeed.activityEntries), current)
  assert.equal(await page.evaluate(() => window.hydrationFeed.hasMoreActivity), true)
}

export async function checkSelectedAuction(page) {
  await page.evaluate(async () => {
    const { React, root } = window
    const { useMarketplaceData } = await import('/src/features/marketplace/useMarketplaceData.ts')
    const { useScopedState } = await import('/src/utils/useScopedState.ts')
    window.auctionListReads = 0
    window.auctionSingleReads = []
    const client = {
      getMarketplaceFixedSalesPage: async () => ({ fixedSales: [], nextCursor: null }),
      getMarketplaceOffersPage: async () => ({ offers: [], nextCursor: null }),
      getMarketplaceAuctionsPage: async ({ cursor }) => {
        window.auctionListReads++
        return { auctions: Array.from({ length: cursor ? 1 : 50 }, (_, index) => ({ node: String(cursor ? 51 : index + 1) })), nextCursor: cursor ? null : 'next' }
      },
      getMarketplaceAuction: async node => {
        window.auctionSingleReads.push(node)
        return window.auctionRemoved ? null : { node, bidCount: 2 }
      },
      getHealth: async () => ({ currentBlockHeight: 100 }),
    }
    function Market() {
      const [tab, setTab] = React.useState('yours')
      const [selectedAuctionNode, selectAuction] = React.useState('')
      const [error, setError] = useScopedState(tab, '')
      const data = useMarketplaceData({ accountScope: 'account', indexerClient: client, mainView: 'marketplace',
        onLoaded: () => {}, selectedAddress: '', selectedAuthority: '', selectedAuctionNode, setError })
      window.reviewMarket = data
      window.openLaterAuction = () => { selectAuction('51'); setTab('browse') }
      return React.createElement('output', { id: 'selected-auction' }, JSON.stringify({ tab, error, auction: data.auctions.find(item => item.node === selectedAuctionNode) ?? null }))
    }
    root.render(React.createElement(Market))
  })
  await page.waitForFunction(() => window.reviewMarket?.auctions.length === 50 && !window.reviewMarket.loading)
  await page.evaluate(() => window.reviewMarket.loadMore())
  await page.waitForFunction(() => window.reviewMarket.auctions.length === 51 && !window.reviewMarket.loading)
  await page.evaluate(() => window.openLaterAuction())
  await page.waitForTimeout(50)
  assert.equal(await page.evaluate(() => window.auctionListReads), 2, 'Changing feedback callback on tab switch must not reload listings')
  assert.equal(JSON.parse(await page.locator('#selected-auction').textContent()).auction?.node, '51')
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await page.waitForFunction(() => window.auctionListReads >= 3 && !window.reviewMarket.loading)
  assert.equal(await page.evaluate(() => window.auctionListReads), 4, 'Focus refreshes every loaded page')
  assert.equal(await page.evaluate(() => window.reviewMarket.auctions.length), 51)
  assert.equal(await page.evaluate(() => window.reviewMarket.hasMore), false, 'Focus must not reset the pagination cursor')
  await page.evaluate(() => window.reviewMarket.loadMarketplace())
  await page.waitForTimeout(30)
  assert.deepEqual(await page.evaluate(() => window.auctionSingleReads), ['51'])
  assert.deepEqual(JSON.parse(await page.locator('#selected-auction').textContent()).auction, { node: '51', bidCount: 2 }, 'A real reload must refresh the selected auction outside page one')
  await page.evaluate(async () => { window.auctionRemoved = true; await window.reviewMarket.loadMarketplace() })
  await page.waitForTimeout(30)
  assert.equal(JSON.parse(await page.locator('#selected-auction').textContent()).auction, null, 'A removed auction must not survive on stale data')
}
