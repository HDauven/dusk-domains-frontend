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
    await import('/src/index.css')
    await import('/src/App.css')
    const { MyDomainRows } = await import('/src/features/domains/my-domains/MyDomainRows.tsx')
    const { PendingReservationsList } = await import('/src/features/domains/my-domains/PendingReservationsList.tsx')
    const copy = await import('/src/features/registration/registrationCopy.ts')
    window.root.render(window.React.createElement('main', { className: 'page' },
      window.React.createElement('section', { className: 'my-names-panel' },
        window.React.createElement(PendingReservationsList, { ...copy, currentBlockHeight: 200,
          pendingReservations: [{ name: 'a-long-domain-name.dusk', commitment: 'commit', committedBlockHeight: null,
            createdAt: new Date().toISOString(), durationYears: 1 }], onOpenPendingReservation: () => {}, onForgetPendingReservation: () => {} }),
        window.React.createElement(MyDomainRows, { myNames: [{ canonicalName: 'a-long-domain-name.dusk', node: 'node', records: [], subnameCount: 0 }],
          primarySummaries: {}, formatNameLifecycle: () => 'Registered', onOpenIndexedName: () => {} }))))
  })
  const open = page.getByRole('button', { name: 'Open', exact: true })
  await open.first().waitFor()
  for (const width of [320, 390, 721, 765, 834, 1060, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const button of await open.all()) {
      const bounds = await button.boundingBox()
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width, `Open clipped at ${width}px`)
    }
    assert.ok(await page.locator('.reservation-summary span').evaluate(element => element.scrollWidth <= element.clientWidth), `Recovery instructions clipped at ${width}px`)
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
          amountDusk: '5', minimumBidLux: 5000000000n }) }, 'Review bid'),
        React.createElement(MarketplaceBidReview, { props: { bidReview, currentBlockHeight: height,
          actionsAvailable: true, onCancelBidReview: () => setReview(null), onPlaceBid: () => {} } }))
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
  for (const [key, label] of [['ArrowRight', 'My marketplace'], ['End', 'Offers'], ['Home', 'Browse'], ['ArrowLeft', 'Offers']]) {
    await page.keyboard.press(key)
    const selected = page.getByRole('tab', { name: label, exact: true })
    assert.equal(await selected.getAttribute('aria-selected'), 'true')
    assert.ok(await selected.evaluate(element => element === document.activeElement))
    assert.equal(await page.locator('[role="tab"][tabindex="0"]').count(), 1)
  }
  assert.deepEqual(errors, [])
  console.log('PASS: UX regression checks')
} finally {
  await browser.close()
}
