import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, expect, it, vi } from 'vitest'
import { SiteFooter } from './SiteFooter'

const render = () => renderToStaticMarkup(<SiteFooter links={{ support: null, abuse: null, security: null, status: null }} onMainViewChange={() => {}} />)
afterEach(() => vi.unstubAllEnvs())

it.each([['dusk:1', 'Testnet'], ['dusk:2', 'Mainnet'], ['dusk:3', 'Mainnet']])('links from %s to %s', (chain, label) => {
  vi.stubEnv('VITE_DUSK_DOMAINS_CHAIN_ID', chain)
  vi.stubEnv('VITE_DUSK_DOMAINS_OTHER_NETWORK_URL', 'https://other.example')
  expect(render()).toContain(`<a href="https://other.example">${label}</a>`)
})

it('omits the network link when its URL is unset', () => {
  vi.stubEnv('VITE_DUSK_DOMAINS_OTHER_NETWORK_URL', '')
  expect(render()).not.toMatch(/Mainnet|Testnet/)
})

it('links to both legal pages', () => {
  expect(render()).toContain('<a href="/terms">Terms</a>')
  expect(render()).toContain('<a href="/privacy">Privacy</a>')
})
