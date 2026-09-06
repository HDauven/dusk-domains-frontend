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
  assert.deepEqual(errors, [])
  console.log('PASS: native Enter submission and stale A → B → A feedback isolation')
} finally {
  await browser.close()
}
