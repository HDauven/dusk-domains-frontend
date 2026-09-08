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
