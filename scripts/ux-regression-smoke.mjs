import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'

const baseUrl = process.env.DUSK_DOMAINS_E2E_BASE_URL || 'http://127.0.0.1:5189/'
for (let attempt = 0; ; attempt++) {
  try { if ((await fetch(baseUrl, { signal: AbortSignal.timeout(1_000) })).ok) break } catch {}
  assert.ok(attempt < 60, 'Start the Vite development server before this check')
  await new Promise(resolve => setTimeout(resolve, 250))
}
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', error => { errors.push(error.message); console.error(error.message) })
  // Keep Vite's React preamble, but do not start the app or contact a chain.
  await page.route(baseUrl, async route => {
    const response = await route.fetch()
    await route.fulfill({ response, body: (await response.text()).replace(/<script[^>]*src="\/src\/main.tsx"[^>]*><\/script>/, '') })
  })
  await page.goto(baseUrl)
  await page.evaluate(async () => {
    const hookSource = await (await fetch('/src/utils/useScopedState.ts')).text()
    const mainSource = await (await fetch('/src/main.tsx')).text()
    const reactUrl = hookSource.match(/from\s+["']([^"']*\/react\.js[^"']*)/)[1]
    const domUrl = mainSource.match(/from\s+["']([^"']*react-dom_client\.js[^"']*)/)[1]
    const { default: React } = await import(reactUrl)
    const { default: ReactDOM } = await import(domUrl)
    const { useScopedState } = await import('/src/utils/useScopedState.ts')
    const { SearchHero } = await import('/src/features/search/SearchHero.tsx')
    const root = ReactDOM.createRoot(document.getElementById('root'))
    function Probe({ scope }) {
      const [value, update] = useScopedState(scope, '')
      window.update = update
      window.oldUpdate ??= update
      return React.createElement('output', { id: 'probe', 'data-scope': scope }, value)
    }
    window.renderScope = scope => root.render(React.createElement(Probe, { scope }))
    window.renderScope('A')
    window.root = root
    window.React = React
    window.renderSearch = () => {
      function Search() {
        const [query, onQueryChange] = React.useState('')
        return React.createElement(SearchHero, { query, onQueryChange, checked: false, loading: false, onCheckAvailability: () => { window.searchCount = (window.searchCount || 0) + 1 } })
      }
      root.render(React.createElement(Search))
    }
  })
  await page.locator('#probe[data-scope="A"]').waitFor({ state: 'attached' })
  await page.evaluate(() => window.update('confirmed'))
  await page.waitForFunction(() => document.querySelector('#probe')?.textContent === 'confirmed')
  for (const scope of ['B', 'A']) {
    await page.evaluate(scope => window.renderScope(scope), scope)
    await page.locator(`#probe[data-scope="${scope}"]`).waitFor({ state: 'attached' })
    await page.evaluate(() => window.oldUpdate('stale success'))
    await page.waitForTimeout(30)
    assert.equal(await page.locator('#probe').textContent(), '')
  }
  await page.evaluate(() => window.update('current success'))
  await page.waitForFunction(() => document.querySelector('#probe')?.textContent === 'current success')
  await page.evaluate(() => window.renderSearch())
  await page.locator('#name-search').fill('aurora.dusk')
  await page.locator('#name-search').press('Enter')
  await page.waitForFunction(() => window.searchCount === 1)
  await page.evaluate(async () => {
    const { React, root } = window
    const { useRegistrationRuntime } = await import('/src/app/useRegistrationRuntime.ts')
    const { upsertPendingNameReservation } = await import('/src/names/internal.ts')
    upsertPendingNameReservation({ name: 'resume.dusk', node: 'node', commitment: 'commit', secret: 'local-test',
      controller: 'controller', ownerAddress: 'owner', chainId: 'dusk:0', durationYears: 1,
      committedBlockHeight: null, committedTxId: 'tx', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    const indexerClient = { getHealth: async () => ({ currentBlockHeight: 200 }),
      getCommitment: async () => ({ committedBlockHeight: 100, committedTxId: 'tx' }) }
    const getCurrentBlockHeight = async () => 200
    function SavedReservation() {
      const [height, setCurrentBlockHeight] = React.useState(null)
      const [, setNowSeconds] = React.useState(0)
      const [preparedCommit, setPreparedCommit] = React.useState(null)
      const { pendingReservations } = useRegistrationRuntime({ mainView: 'search', chainId: 'dusk:0',
        selectedAuthority: 'controller', selectedAddress: '', registrationAddressInput: '', registrationStep: 'duration',
        walletSetupState: 'disconnected', indexerClient, getCurrentBlockHeight, preparedCommit, setPreparedCommit,
        setCurrentBlockHeight, setNowSeconds, canRegister: true, committed: false, registerSetsPrimary: false })
      return React.createElement('output', { id: 'saved-reservation' }, `${height}:${pendingReservations[0]?.committedBlockHeight}`)
    }
    root.render(React.createElement(SavedReservation))
  })
  await page.waitForFunction(() => document.querySelector('#saved-reservation')?.textContent === '200:100')
  await page.evaluate(async () => {
    const { React, root } = window
    const { SearchWorkspace } = await import('/src/features/search/SearchWorkspace.tsx')
    const props = { checked: true, loading: false, query: 'owned.dusk', resultView: 'overview',
      onQueryChange: () => {}, onCheckAvailability: () => {},
      availabilityProps: { displayName: 'owned.dusk', reserved: false, status: 'available' },
      overviewProps: { canRegister: true, displayName: 'owned.dusk', resultStatus: 'available', resultIssues: [],
        savedReservation: null, savedReservationWindow: null, subnameCount: 0, primaryVerified: false,
        onContinueRegistration: () => {}, onOpenPendingReservation: () => {}, onOpenPendingReservations: () => {}, onViewDetails: () => {} } }
    window.renderReadReady = resultReady => root.render(React.createElement(SearchWorkspace, { ...props, resultReady }))
    window.renderReadReady(true)
  })
  await page.getByRole('button', { name: 'Continue registration' }).waitFor()
  assert.equal(await page.locator('.availability-pill').textContent(), 'Available')
  await page.evaluate(() => window.renderReadReady(false))
  await page.getByRole('status').filter({ hasText: 'Domain data is unavailable' }).waitFor()
  assert.equal(await page.getByText('Available', { exact: true }).count(), 0)
  assert.equal(await page.getByRole('button', { name: 'Continue registration' }).count(), 0)
  await page.evaluate(() => window.renderReadReady(true))
  await page.getByRole('button', { name: 'Continue registration' }).waitFor()
  await page.evaluate(async () => {
    const { React, root } = window
    const { MarketplaceView } = await import('/src/features/marketplace/MarketplaceView.tsx')
    root.render(React.createElement(MarketplaceView, { auctions: [], fixedSales: [], offers: [], watchedNodes: [],
      actionsAvailable: false, marketplaceEnabled: true, tab: 'browse',
      txState: { status: 'awaiting_approval', context: { title: 'Make offer' } } }))
  })
  await page.locator('.tx-status.awaiting_approval').waitFor()
  assert.equal(await page.getByText('Connect a wallet to transact.', { exact: true }).count(), 0)
  await page.evaluate(async () => {
    const { React, root } = window
    const { useMarketplaceFeature } = await import('/src/features/marketplace/useMarketplaceFeature.ts')
    const { createDuskNodeBlockHeightReader } = await import('/src/app/duskNodeHeight.ts')
    const { createDuskDomainsOnChainClient } = await import('/src/names/internal.ts')
    localStorage.removeItem('dusk-domains-marketplace-watchlist-v1')
    const auction = { node: `0x${'11'.repeat(32)}`, name: 'heightbound.dusk', sellerAuthority: `0x${'22'.repeat(32)}`,
      reservePriceLux: 5000000000, startBlockHeight: null, endBlockHeight: null, bidCount: 0, highestBid: null }
    window.heightBoundAuction = auction
    const currentBlockHeight = createDuskNodeBlockHeightReader('http://node.test/', async (_input, init) => {
      window.heightFetchStarted = true
      return new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => {
        window.heightFetchAborted = true
        reject(init.signal.reason)
      }, { once: true }))
    })
    const args = { mainView: 'search', indexerClient: null, liveWritesAvailable: true,
      selectedAddress: 'buyer', selectedAuthority: `0x${'33'.repeat(32)}`,
      runtimeConfig: { chainId: 'dusk:0', capabilities: { marketplace: true }, contracts: { marketplace: { contractId: `0x${'55'.repeat(32)}` } } },
      duskDomainsOnChainClient: createDuskDomainsOnChainClient({ read: { read: async () => null }, currentBlockHeight }),
      marketplaceOnChainClient: { getAuction: async () => ({ ok: true, value: { ...auction,
        reservePriceLux: 5000000000n, startBlock: null, endBlock: null } }) },
      ensurePublicBalanceForLiveWrite: async () => true, onOpenWalletConnection: () => {},
      submitNameWrite: async (_name, _call, options) => {
        window.heightBoundWrites = (window.heightBoundWrites || 0) + 1
        const state = { status: 'executed', txId: 'fixture-bid', context: { title: 'Place bid' } }
        options.onUpdate(state)
        return state
      } }
    function BidSync() {
      const { marketplaceProps: props } = useMarketplaceFeature(args)
      window.heightBoundMarketplace = props
      return React.createElement('output', { id: 'height-bound-bid', 'data-status': props.txState?.status,
        'data-watched': props.watchedNodes.includes(auction.node) }, `${props.confirmation} ${props.error}`)
    }
    root.render(React.createElement(BidSync))
  })
  await page.locator('#height-bound-bid').waitFor({ state: 'attached' })
  await page.evaluate(() => window.heightBoundMarketplace.onBidDraftChange(window.heightBoundAuction.node, '5'))
  await page.waitForFunction(() => window.heightBoundMarketplace.bidDrafts[window.heightBoundAuction.node] === '5')
  await page.evaluate(() => {
    window.heightBoundBidDone = false
    void window.heightBoundMarketplace.onPlaceBid(window.heightBoundAuction).then(() => { window.heightBoundBidDone = true })
  })
  await page.waitForFunction(() => window.heightFetchStarted)
  assert.equal(await page.locator('#height-bound-bid').getAttribute('data-status'), 'executed')
  assert.match(await page.locator('#height-bound-bid').textContent(), /Syncing marketplace data/)
  await page.waitForFunction(() => window.heightBoundBidDone, null, { timeout: 15_000 })
  assert.ok(await page.evaluate(() => window.heightFetchAborted))
  assert.equal(await page.evaluate(() => window.heightBoundWrites), 1)
  assert.equal(await page.locator('#height-bound-bid').getAttribute('data-status'), 'executed')
  assert.equal(await page.locator('#height-bound-bid').getAttribute('data-watched'), 'true')
  assert.match(await page.locator('#height-bound-bid').textContent(), /Transaction confirmed, but marketplace data is still syncing/)
  assert.doesNotMatch(await page.locator('#height-bound-bid').textContent(), /Syncing marketplace data|Transaction failed/)
  await page.evaluate(async () => {
    await import('/src/index.css')
    await import('/src/App.css')
    const { MyDomainRows } = await import('/src/features/domains/my-domains/MyDomainRows.tsx')
    window.root.render(window.React.createElement('main', { className: 'page' },
      window.React.createElement('section', { className: 'my-names-panel' },
        window.React.createElement(MyDomainRows, { myNames: [{ canonicalName: 'a-long-domain-name.dusk', node: 'node', records: [], subnameCount: 0 }],
          primarySummaries: {}, formatNameLifecycle: () => 'Registered', onOpenIndexedName: () => {} }))))
  })
  const open = page.getByRole('button', { name: 'Open', exact: true })
  await open.waitFor()
  for (const width of [390, 721, 765, 834, 1060, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    const bounds = await open.boundingBox()
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width, `Open clipped at ${width}px`)
  }
  assert.deepEqual(errors, [])
  console.log('PASS: Enter, scoped feedback, saved-reservation refresh and responsive Open buttons')
} finally {
  await browser.close()
}
