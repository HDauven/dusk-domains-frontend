// @vitest-environment happy-dom
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import App from '../App'

// A server render runs no effects, so it is what a cold load paints first, before useUrlRoute
// opens the route.
function firstPaint(path: string) {
  window.history.replaceState(null, '', path)
  return renderToStaticMarkup(<App />).match(/<main[\s\S]*<\/main>/)![0]
}

beforeEach(() => { vi.stubEnv('VITE_DUSK_DOMAINS_INDEXER_URL', 'https://indexer.test') })
afterEach(() => {
  vi.unstubAllEnvs()
  window.history.replaceState(null, '', '/')
})

it('paints the home page for /', () => {
  expect(firstPaint('/')).toContain('<section class="hero" id="search"')
})

it('paints a linked name as loading, not the home page', () => {
  const main = firstPaint('/name/pie.dusk')
  expect(main).toContain('Checking the name')
  expect(main).not.toContain('id="search"')
})

it.each([
  ['/market', '>Market</h1>'],
  ['/my', '>My names</h1>'],
  ['/referrals', '>Referrals</h1>'],
  ['/treasury', '>Treasury</h1>'],
  ['/terms', '>Terms of Use</h1>'],
  ['/privacy', '>Privacy Notice</h1>'],
  [`/market/auction/0x${'ab'.repeat(32)}`, '>Auction</h1>'],
])('paints %s as that view', (path, heading) => {
  const main = firstPaint(path)
  expect(main).toContain(heading)
  expect(main).not.toContain('id="search"')
})

it('opens a sell link on the Sell tab', () => {
  expect(firstPaint('/market/sell/pie.dusk')).toMatch(/id="marketplace-views-sell" aria-controls="[^"]*" aria-selected="true"/)
})
