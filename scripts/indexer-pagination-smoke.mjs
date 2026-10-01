import assert from 'node:assert/strict'

export async function checkIndexerPagination(page) {
  await page.evaluate(async () => {
    const { React, root } = window
    const { useMarketplaceData } = await import('/src/features/marketplace/useMarketplaceData.ts')
    const { useAuctions } = await import('/src/features/marketplace/useAuctions.ts')
    const { useActivityFeed } = await import('/src/features/activity/useActivityFeed.ts')
    const { ActivityHistoryView } = await import('/src/features/activity/ActivityHistoryView.tsx')
    const calls = []
    const client = {
      getMarketplaceFixedSales: async () => [{ node: 'sale-1' }],
      getMarketplaceAuctions: async () => [],
      getMarketplaceOffers: async () => [],
      getMarketplaceFixedSalesPage: async ({ cursor }) => {
        calls.push(['sales', cursor])
        if (window.delayMarketPage && cursor) return new Promise(resolve => { window.finishMarketPage = resolve })
        return { fixedSales: [{ node: cursor ? 'sale-2' : 'sale-1' }], nextCursor: cursor ? null : 'sales-next' }
      },
      getMarketplaceAuctionsPage: async () => { calls.push(['auctions']); return { auctions: [], nextCursor: null } },
      getMarketplaceOffersPage: async () => { calls.push(['offers']); return { offers: [], nextCursor: null } },
      getHealth: async () => ({ currentBlockHeight: 10 }),
      getActivityPage: async (node, { cursor }) => {
        calls.push(['activity', node, cursor])
        if (window.delayActivityPage) return new Promise(resolve => { window.finishActivityPage = resolve })
        return { activity: [entry(cursor ? 'second' : 'first', node)], nextCursor: cursor ? null : 'activity-next' }
      },
    }
    const setError = message => { window.paginationError = message }
    function entry(id, node = 'one') {
      return { id, node, name: 'one.dusk', eventType: 'registration', actor: 'owner', timestamp: '', blockHeight: 1 }
    }
    function Market() {
      const data = useMarketplaceData({ accountScope: 'account', indexerClient: client, mainView: 'marketplace', onLoaded: () => {}, selectedAddress: '', selectedAuthority: '', setError })
      window.marketData = data
      return React.createElement('div', null,
        React.createElement('output', { id: 'market-page-probe' }, JSON.stringify({ sales: data.fixedSales.map(row => row.node), more: data.hasMore, loading: data.loading })),
        data.hasMore && React.createElement('button', { id: 'market-more', disabled: data.loading, onClick: data.loadMore }, 'Load more'))
    }
    function Activity({ node }) {
      const feed = useActivityFeed({ defaultName: `${node}.dusk`, defaultNode: node, indexerClient: client, setError })
      window.activityFeed = feed
      return React.createElement(ActivityHistoryView, { activityEntries: feed.activityEntries, loading: feed.activityLoading,
        hasMore: feed.hasMoreActivity, onLoadMore: feed.loadMoreActivity, currentBlockHeight: 10, displayName: `${node}.dusk`,
        recentWarnings: [], viewerAuthority: 'owner', formatActivityTime: () => '' })
    }
    const emptyAuctions = []
    function Auction() {
      const [selectedAuctionNode, setSelectedAuctionNode] = React.useState('')
      const state = useAuctions({ accountScope: 'account', marketScope: 'market', auctions: emptyAuctions, indexerClient: client,
        selectedAuctionNode, setSelectedAuctionNode, loadMarketplace: async () => {}, marketplaceOnChainClient: null, onBidPlaced: () => {}, selectedAuthority: '',
        setConfirmation: () => {}, setError, writes: {} })
      window.auctionPages = state
      return React.createElement('output', { id: 'auction-page-probe' }, state.auctionActivity.map(row => row.id).join(','))
    }
    window.renderAuctionPages = () => root.render(React.createElement(Auction))
    window.paginationCalls = calls
    window.renderMarketPages = () => root.render(React.createElement(Market))
    window.renderActivityPages = node => root.render(React.createElement(Activity, { node }))
    window.seedActivity = node => {
      window.activityFeed.setActivityEntries([entry('first', node)])
      window.activityFeed.setActivityCursor({ node, cursor: 'activity-next' })
    }
    window.renderMarketPages()
  })
  await page.waitForFunction(() => window.marketData?.fixedSales.length === 1 && !window.marketData.loading)
  assert.equal(await page.evaluate(() => window.marketData.hasMore), true, 'The first marketplace page must expose continuation')
  await page.locator('#market-more').click()
  await page.waitForFunction(() => window.marketData.fixedSales.length === 2 && !window.marketData.loading)
  assert.equal(await page.locator('#market-more').count(), 0)
  assert.deepEqual(await page.evaluate(() => window.paginationCalls.filter(([route]) => route !== 'sales')), [['auctions'], ['offers']])

  // A refresh invalidates an older pending continuation.
  await page.evaluate(async () => { await window.marketData.loadMarketplace(); window.delayMarketPage = true })
  await page.waitForFunction(() => window.marketData.hasMore && !window.marketData.loading)
  await page.locator('#market-more').click()
  await page.waitForFunction(() => Boolean(window.finishMarketPage))
  await page.evaluate(() => window.marketData.loadMarketplace())
  await page.evaluate(() => window.finishMarketPage({ fixedSales: [{ node: 'stale' }], nextCursor: null }))
  await page.waitForTimeout(30)
  assert.deepEqual(await page.evaluate(() => window.marketData.fixedSales.map(row => row.node)), ['sale-1'])

  await page.evaluate(() => window.renderActivityPages('one'))
  await page.waitForFunction(() => Boolean(window.activityFeed))
  await page.evaluate(() => window.seedActivity('one'))
  await page.getByRole('button', { name: 'Load more activity', exact: true }).click()
  await page.waitForFunction(() => window.activityFeed.activityEntries.length === 2)
  assert.equal(await page.getByRole('button', { name: 'Load more activity', exact: true }).count(), 0)
  assert.deepEqual(await page.evaluate(() => window.paginationCalls.at(-1)), ['activity', 'one', 'activity-next'])

  await page.evaluate(() => { window.seedActivity('one'); window.delayActivityPage = true })
  await page.getByRole('button', { name: 'Load more activity', exact: true }).click()
  await page.waitForFunction(() => Boolean(window.finishActivityPage))
  await page.evaluate(() => window.renderActivityPages('two'))
  await page.getByText('Every change to two.dusk, newest first.').waitFor()
  await page.evaluate(() => { window.seedActivity('two'); window.finishActivityPage({ activity: [{ id: 'stale' }], nextCursor: null }) })
  await page.waitForTimeout(30)
  assert.deepEqual(await page.evaluate(() => window.activityFeed.activityEntries.map(entry => entry.id)), ['first'])
  await page.evaluate(() => { window.delayActivityPage = false; window.renderAuctionPages() })
  await page.waitForFunction(() => Boolean(window.auctionPages))
  await page.evaluate(() => window.auctionPages.openAuction('auction'))
  await page.waitForFunction(() => window.auctionPages.auctionActivity.length === 1 && !window.auctionPages.auctionActivityLoading)
  assert.equal(await page.evaluate(() => window.auctionPages.hasMoreActivity), true)
  await page.evaluate(() => window.auctionPages.loadMoreActivity())
  await page.waitForFunction(() => window.auctionPages.auctionActivity.length === 2)
  assert.equal(await page.evaluate(() => window.auctionPages.hasMoreActivity), false)
  assert.deepEqual(await page.evaluate(() => window.paginationCalls.at(-1)), ['activity', 'auction', 'activity-next'])
  assert.equal(await page.evaluate(() => window.paginationError || ''), '')
}
