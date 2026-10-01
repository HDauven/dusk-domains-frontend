import { checkAuctionRoute } from './url-route-smoke.mjs'
import { checkListingFeeReview } from './marketplace-fee-smoke.mjs'
import { checkMarketplaceReviews, checkMarketplaceBrowse, checkMarketplaceInventory } from './marketplace-ux-smoke.mjs'
import { checkNameManagement } from './name-management-smoke.mjs'
import { checkPrimaryNameSwitches } from './primary-name-smoke.mjs'
import { checkUiSystem } from './ui-system-smoke.mjs'
import { checkNameFit } from './name-fit-smoke.mjs'
import assert from 'node:assert/strict'
import { checkIndexerSessionBudget } from './indexer-session-smoke.mjs'
import { checkInitialHydration, checkSelectedAuction } from './indexer-review-smoke.mjs'
import { checkIndexerPagination } from './indexer-pagination-smoke.mjs'
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
      searchName: async () => ({ status: 'available' }),
      getCommitment: async () => ({ controller: 'controller', committedBlockHeight: 100, committedTxId: 'tx' }) }
    const getCurrentBlockHeight = async () => 200
    function SavedReservation() {
      const [height, setCurrentBlockHeight] = React.useState(null)
      const [, setNowSeconds] = React.useState(0)
      const [preparedCommit, setPreparedCommit] = React.useState(null)
      const { pendingReservations } = useRegistrationRuntime({ mainView: 'search', chainId: 'dusk:0',
        selectedAuthority: 'controller', selectedAddress: '', indexerClient, getCurrentBlockHeight, preparedCommit, setPreparedCommit,
        setCurrentBlockHeight, setNowSeconds })
      return React.createElement('output', { id: 'saved-reservation' }, `${height}:${pendingReservations[0]?.committedBlockHeight}`)
    }
    root.render(React.createElement(SavedReservation))
  })
  await page.waitForFunction(() => document.querySelector('#saved-reservation')?.textContent === '200:100')
  await page.evaluate(async () => {
    const { React, root } = window
    const { SearchWorkspace } = await import('/src/features/search/SearchWorkspace.tsx')
    const props = { checked: true, loading: false, query: 'owned.dusk', resultView: 'overview',
      onQueryChange: () => {}, onCheckAvailability: () => {}, onResultViewChange: () => {},
      headerProps: { displayName: 'owned.dusk', expiresLabel: null, primaryVerified: false, records: [], reserved: false, status: 'available' },
      overviewProps: { canRegister: true, displayName: 'owned.dusk', duration: 1, expiryDate: '2027-09-27', feeConfigLoading: false,
        registrationFee: 10, resultStatus: 'available', resultIssues: [],
        savedReservation: null, savedReservationWindow: null,
        onContinueRegistration: () => {}, onDurationChange: () => {}, onOpenPendingReservation: () => {}, onOpenPendingReservations: () => {}, onViewDetails: () => {} } }
    window.renderReadReady = resultReady => root.render(React.createElement(SearchWorkspace, { ...props, resultReady }))
    window.renderReadReady(true)
  })
  await page.getByRole('button', { name: 'Claim owned.dusk' }).waitFor()
  assert.equal(await page.locator('.claim-card .status-badge').textContent(), 'Available')
  await page.evaluate(() => window.renderReadReady(false))
  await page.getByRole('status').filter({ hasText: 'Name data is unavailable' }).waitFor()
  assert.equal(await page.getByText('Available', { exact: true }).count(), 0)
  assert.equal(await page.getByRole('button', { name: 'Claim owned.dusk' }).count(), 0)
  await page.evaluate(() => window.renderReadReady(true))
  await page.getByRole('button', { name: 'Claim owned.dusk' }).waitFor()
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
  assert.match(await page.locator('#height-bound-bid').textContent(), /Marketplace data is still syncing/)
  assert.doesNotMatch(await page.locator('#height-bound-bid').textContent(), /Syncing marketplace data|Transaction failed/)
  await page.evaluate(async () => {
    await import('/src/index.css')
    await import('/src/App.css')
    const { MyDomainsView } = await import('/src/features/domains/MyDomainsView.tsx')
    window.root.render(window.React.createElement('main', { className: 'page' },
      window.React.createElement(MyDomainsView, { currentBlockHeight: 200, loading: false, myNamesError: '', selectedAddress: 'owner',
        pendingReservations: [{ name: 'a-long-domain-name.dusk', commitment: 'commit', committedBlockHeight: null,
          createdAt: new Date().toISOString(), durationYears: 1 }],
        myNames: [{ canonicalName: `${'a'.repeat(63)}.dusk`, node: 'node', records: [], subnameCount: 0, expiresAtBlockHeight: 900, graceEndsAtBlockHeight: 1000 }],
        primarySummaries: {}, onConnectWallet: () => {}, onForgetPendingReservation: () => {}, onOpenIndexedName: () => {},
        onOpenPendingReservation: () => {}, onRefresh: () => {}, onSearchHome: () => {} })))
  })
  const open = page.getByRole('button', { name: 'Open', exact: true })
  await open.first().waitFor()
  for (const width of [320, 390, 721, 765, 834, 1060, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const button of await open.all()) {
      const bounds = await button.boundingBox()
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width, `Open clipped at ${width}px`)
    }
    assert.ok(await page.locator('.pending-reservation-main p').evaluate(element => element.scrollWidth <= element.clientWidth), `Recovery instructions clipped at ${width}px`)
    const card = await page.locator('.name-portrait').boundingBox()
    assert.ok(card.x >= 0 && card.x + card.width <= width, `Name card clipped at ${width}px`)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `Page overflows at ${width}px`)
  }
  await page.evaluate(async () => {
    const { React, root } = window
    const { MarketplaceBidReview } = await import('/src/features/marketplace/MarketplaceBidReview.tsx')
    const auction = { name: `${'a'.repeat(63)}.dusk`, highestBid: null, reservePriceLux: 5e9,
      startBlockHeight: null, durationBlocks: 8640 }
    function Review() {
      const [bidReview, setReview] = React.useState(null)
      const [height, setHeight] = React.useState(100)
      window.redrawReview = () => setHeight(value => value + 1)
      return React.createElement(React.Fragment, null,
        React.createElement('button', { id: 'review-trigger', onClick: () => setReview({ auction,
          amountDusk: '5', amountLux: 5000000000n, minimumBidLux: 5000000000n }) }, 'Review bid'),
        React.createElement(MarketplaceBidReview, { props: { bidReview, currentBlockHeight: height,
          selectedAddress: 'x'.repeat(100), actionsAvailable: true, onCancelBidReview: () => setReview(null), onPlaceBid: () => {} } }))
    }
    root.render(React.createElement(Review))
  })
  const trigger = page.getByRole('button', { name: 'Review bid', exact: true })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: /^Bid on/ })
  await dialog.waitFor()
  assert.ok(await dialog.evaluate(element => element.matches(':modal')))
  for (const key of ['Tab', 'Tab', 'Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab']) {
    await page.keyboard.press(key)
    // Native dialogs can yield to browser chrome, but never to background controls.
    assert.ok(await dialog.evaluate(element => element.contains(document.activeElement) || document.activeElement === document.body), 'Focus escaped bid review')
  }
  await trigger.evaluate(element => element.focus())
  assert.equal(await trigger.evaluate(element => element === document.activeElement), false, 'Background is not inert')
  const focused = await page.evaluate(() => document.activeElement.textContent)
  await page.evaluate(() => window.redrawReview())
  await page.waitForTimeout(50)
  assert.equal(await page.evaluate(() => document.activeElement.textContent), focused)
  for (const width of [320, 390, 834, 1440]) {
    await page.setViewportSize({ width, height: 640 })
    assert.ok(await page.locator('.marketplace-bid-review').evaluate(element => element.scrollWidth <= element.clientWidth), `Bid review overflows at ${width}px`)
    const close = page.getByRole('button', { name: 'Close bid review' })
    await close.scrollIntoViewIfNeeded()
    assert.ok(await close.evaluate(element => { const r = element.getBoundingClientRect(); return element.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)) }), 'Review is obscured')
  }
  await page.keyboard.press('Escape')
  await dialog.waitFor({ state: 'detached' })
  assert.ok(await trigger.evaluate(element => element === document.activeElement), 'Focus not restored')
  await trigger.click()
  await page.getByRole('button', { name: 'Go back', exact: true }).click()
  await dialog.waitFor({ state: 'detached' })
  assert.ok(await trigger.evaluate(element => element === document.activeElement), 'Button dismissal lost focus')
  await page.evaluate(async () => {
    const { React, root } = window
    const { TreasuryClaimCard } = await import('/src/features/treasury/cards/TreasuryClaimCard.tsx')
    const { ReferralLinkCard } = await import('/src/features/referrals/ReferralLinkCard.tsx')
    const address = 'owner-wallet-address'.repeat(8)
    root.render(React.createElement('main', { className: 'page' }, React.createElement('div', { className: 'account-grid' },
      React.createElement(TreasuryClaimCard, { treasuryState: { availableLux: 50075000000, operatorRecipient: address },
        treasuryRecipientMatchesOperator: true, selectedAddress: address, showTreasuryClaimControls: true,
        showTreasuryClaimReview: true, treasuryReviewAmountLux: 1000000000, treasuryReviewLabel: 'Claim amount',
        treasuryConnectedWalletLabel: 'Signing wallet', treasuryClaimAmount: '1', onTreasuryClaimAmountChange: () => {} }),
      React.createElement(ReferralLinkCard, { selectedAddress: address, referralLink: 'https://example.test/?ref=wallet' }))))
  })
  await page.getByRole('textbox', { name: 'Referral link', exact: true }).waitFor()
  for (const width of [320, 390, 834, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    assert.ok(await page.locator('.treasury-claim-control').evaluate(element => {
      const width = document.documentElement.clientWidth
      return [...element.querySelectorAll('input,button')].every(control => { const rect = control.getBoundingClientRect(); return rect.left >= 0 && rect.right <= width })
    }), `Treasury controls clipped at ${width}px`)
  }
  await page.evaluate(async () => {
    const { React, root } = window
    const { MarketplaceView } = await import('/src/features/marketplace/MarketplaceView.tsx')
    const props = { auctions: [], fixedSales: [], offers: [], watchedNodes: [], marketplaceEnabled: false, actionsAvailable: false }
    function Tabs() {
      const [tab, onTabChange] = React.useState('browse')
      return React.createElement(MarketplaceView, { ...props, tab, onTabChange })
    }
    root.render(React.createElement(Tabs))
  })
  await page.getByRole('tab', { name: 'Browse', exact: true }).focus()
  for (const [key, label] of [['ArrowRight', 'Yours'], ['End', 'Offers'], ['Home', 'Browse'], ['ArrowLeft', 'Offers']]) {
    await page.keyboard.press(key)
    const selected = page.getByRole('tab', { name: label, exact: true })
    assert.equal(await selected.getAttribute('aria-selected'), 'true')
    assert.ok(await selected.evaluate(element => element === document.activeElement))
    assert.equal(await page.locator('[role="tab"][tabindex="0"]').count(), 1)
  }
  let releaseBls
  const blsGate = new Promise(resolve => { releaseBls = resolve })
  let blsRequested = false
  await page.route(/bls12-381/, async route => {
    blsRequested = true
    await blsGate
    await route.continue()
  })
  await page.evaluate(async () => {
    const { React, root } = window
    const { useReferralControls } = await import('/src/features/referrals/useReferralControls.ts')
    localStorage.removeItem('dusk-domains.active-referral')
    function Referrals() {
      const controls = useReferralControls({ selectedAddress: '', setReferralError: () => {} })
      window.referralControls = controls
      return React.createElement('output', { id: 'referral-probe' }, JSON.stringify(controls.referralState))
    }
    root.render(React.createElement(Referrals))
  })
  await page.locator('#referral-probe').waitFor()
  assert.equal(blsRequested, false, 'Empty attribution must not load BLS')
  const moonlight = '24bfNr8MDUo5xJBecmeGzXDEraax4Cmbnhjyyt5GaL1Vbe6H48ZSYTpmjRDcFRDFzgzuePAPUNcdGMnBzBQBk4zAMgBCtPsY27tBJtKmB1st6qcmpzRR4Er5imxrzvMRnfWc'
  await page.evaluate(input => window.referralControls.handleReferralInputChange(input), moonlight)
  await page.waitForFunction(input => window.referralControls.referralState.input === input, moonlight)
  assert.equal(await page.evaluate(() => window.referralControls.referralState.valid), false)
  assert.equal(await page.evaluate(() => window.referralControls.referralState.principal), null)
  const blsRequest = await page.waitForRequest(/bls12-381/, { timeout: 1000 }).catch(() => null)
  assert.ok(blsRequested || blsRequest, 'Moonlight attribution must load BLS')
  await page.evaluate(() => window.referralControls.clearReferral())
  await page.waitForFunction(() => window.referralControls.referralState.input === '')
  releaseBls()
  await page.evaluate(async input => {
    const { referralStateFromInput } = await import('/src/features/referrals/referralState.ts')
    await referralStateFromInput(input)
  }, moonlight)
  await page.waitForTimeout(30)
  assert.equal(await page.evaluate(() => window.referralControls.referralState.input), '', 'Late validation restored a cleared referral')
  assert.equal(await page.evaluate(() => localStorage.getItem('dusk-domains.active-referral')), null)
  await page.evaluate(input => window.referralControls.handleReferralInputChange(input), `  ${moonlight}  `)
  await page.waitForFunction(() => window.referralControls.referralState.valid)
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('dusk-domains.active-referral')).input), moonlight)
  for (const lastByte of [0, 2]) {
    await page.evaluate(async lastByte => {
      const { encodeBase58 } = await import('/src/names/internal.ts')
      window.referralControls.handleReferralInputChange(encodeBase58([0x80, ...Array(94).fill(0), lastByte]))
    }, lastByte)
    await page.waitForFunction(() => window.referralControls.referralState.reason === 'Referral ignored: this address cannot claim rewards.')
    assert.equal(await page.evaluate(() => window.referralControls.referralState.principal), null)
    assert.equal(await page.evaluate(() => localStorage.getItem('dusk-domains.active-referral')), null)
  }
  await checkIndexerPagination(page)
  await checkInitialHydration(page)
  await checkSelectedAuction(page)
  await checkIndexerSessionBudget(page)
  await page.clock.install()
  await page.evaluate(async () => {
    const { React, root } = window
    const { useOperatorPause } = await import('/src/app/useOperatorPause.ts')
    const { OperatorPauseBanner } = await import('/src/app/OperatorPauseBanner.tsx')
    window.pauseHealth = { ok: true, pause: { registrationsPaused: true, tradingPaused: true } }
    const client = { getHealth: async () => window.pauseHealth }
    function PauseProbe() {
      const pause = useOperatorPause(client, 'pause-smoke')
      return React.createElement('section', { id: 'pause-probe' }, React.createElement(OperatorPauseBanner, { pause }))
    }
    root.render(React.createElement(PauseProbe))
  })
  await page.getByText('Registrations paused.', { exact: false }).waitFor()
  await page.getByText('Marketplace trading paused.', { exact: false }).waitFor()
  await page.evaluate(() => { window.pauseHealth = { ok: false, pause: { registrationsPaused: false, tradingPaused: false } } })
  await page.clock.runFor(10_000)
  assert.match(await page.locator('#pause-probe').textContent(), /Registrations paused/)
  await page.evaluate(() => { window.pauseHealth.ok = true })
  await page.clock.runFor(10_000)
  await page.waitForFunction(() => document.querySelector('#pause-probe')?.textContent === '')
  // A write prepared before a pause is observed must still be refused at submit.
  await page.evaluate(async () => {
    const { React, root } = window
    const { useDuskDomainWriter } = await import('/src/app/useDuskDomainWriter.ts')
    function WriterProbe({ pause }) {
      const submit = useDuskDomainWriter({ pause, contracts: {}, liveDuskDomainsApp: {} })
      window.firstSubmit ??= submit
      React.useEffect(() => { window.writerPause = pause }, [pause])
      return null
    }
    window.renderWriter = (pause) => root.render(React.createElement(WriterProbe, { pause }))
    window.renderWriter({ registrationsPaused: false, tradingPaused: false })
  })
  await page.waitForFunction(() => window.writerPause?.tradingPaused === false)
  await page.evaluate(() => window.renderWriter({ registrationsPaused: false, tradingPaused: true }))
  await page.waitForFunction(() => window.writerPause?.tradingPaused === true)
  const staleSubmit = await page.evaluate(() => window.firstSubmit('name.dusk', { contract: 'marketplace', functionName: 'buy_fixed_sale_runtime' })
    .then(() => 'submitted', (error) => error.message))
  assert.match(staleSubmit, /Marketplace trading is paused/)
  await checkAuctionRoute(page)
  await checkListingFeeReview(page)
  await checkMarketplaceReviews(page)
  await checkMarketplaceBrowse(page)
  await checkMarketplaceInventory(page)
  await checkNameManagement(page)
  await checkPrimaryNameSwitches(page)
  await checkUiSystem(page)
  await checkNameFit(page)
  await page.evaluate(() => window.root.unmount())
  assert.deepEqual(errors, [])
  console.log('PASS: UX regression checks')
} finally {
  await browser.close()
}
