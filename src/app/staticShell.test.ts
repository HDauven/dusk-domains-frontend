// @vitest-environment happy-dom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { StrictMode, act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'
import { watchStaticShell } from './staticShell'
import { injectStaticShell, staticShellFile } from './staticShellHtml'

// The static shell is the app's own first render of the home page for the dusk.domains
// deployment. `npm run shell` writes it again after the home page changes.
const contract = (byte: string) => `0x${byte.repeat(32)}`
const deployment = {
  VITE_DUSK_DOMAINS_NODE_URL: 'https://testnet.nodes.dusk.network',
  VITE_DUSK_DOMAINS_CHAIN_ID: 'dusk:2',
  VITE_DUSK_DOMAINS_INDEXER_URL: '/api',
  VITE_DUSK_DOMAINS_ENABLE_LIVE_WRITES: 'true',
  VITE_DUSK_DOMAINS_ENABLE_MARKETPLACE: 'true',
  VITE_DUSK_DOMAINS_ENABLE_REFERRAL_ATTRIBUTION: 'true',
  VITE_DUSK_DOMAINS_ENABLE_REFERRAL_CLAIMS: 'true',
  VITE_DUSK_DOMAINS_ROUTER_CONTRACT_ID: contract('11'),
  VITE_DUSK_DOMAINS_CORE_CONTRACT_ID: contract('22'),
  VITE_DUSK_DOMAINS_TREASURY_CONTRACT_ID: contract('33'),
  VITE_DUSK_DOMAINS_RESOLVER_CONTRACT_ID: contract('44'),
  VITE_DUSK_DOMAINS_MARKETPLACE_CONTRACT_ID: contract('55'),
  VITE_DUSK_DOMAINS_ROUTER_DRIVER_URL: '/contracts/dusk-domains-router.data-driver.wasm',
  VITE_DUSK_DOMAINS_CORE_DRIVER_URL: '/contracts/dusk-domains-core.data-driver.wasm',
  VITE_DUSK_DOMAINS_TREASURY_DRIVER_URL: '/contracts/dusk-domains-treasury.data-driver.wasm',
  VITE_DUSK_DOMAINS_MARKETPLACE_DRIVER_URL: '/contracts/dusk-domains-marketplace.data-driver.wasm',
  VITE_DUSK_DOMAINS_SUPPORT_URL: 'https://github.com/HDauven/dusk-domains-frontend/issues/new?template=support-request.yml',
  VITE_DUSK_DOMAINS_ABUSE_URL: 'https://github.com/HDauven/dusk-domains-frontend/issues/new?template=abuse-report.yml',
  VITE_DUSK_DOMAINS_SECURITY_URL: 'https://github.com/HDauven/dusk-domains-frontend/security/advisories/new',
}

let App: typeof import('../App').default
beforeAll(async () => {
  for (const [key, value] of Object.entries(deployment)) vi.stubEnv(key, value)
  // Nothing the first render shows comes from the network.
  vi.stubGlobal('fetch', () => new Promise(() => {}))
  App = (await import('../App')).default
}, 120_000)

afterEach(() => {
  document.body.innerHTML = ''
})

const text = (element: Element | null | undefined) => element?.textContent?.replace(/\s+/g, ' ').trim()

it('is the home page exactly as the app renders it first', async () => {
  // React's server render leads with resource hints that the mounted app does not have.
  const shell = renderToStaticMarkup(createElement(App)).replace(/^(?:<link [^>]*\/>)+/, '')
  await expect(shell).toMatchFileSnapshot('./static-shell.html')
})

it('hands focus and typed text over to the mounted app, which shows the same hero', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const page = injectStaticShell(readFileSync(resolve('index.html'), 'utf8'), readFileSync(staticShellFile, 'utf8'))
  document.body.innerHTML = /<body>([\s\S]*)<\/body>/.exec(page)![1].replace(/<script[\s\S]*?<\/script>/g, '')
  const container = document.getElementById('root')!
  const shellInput = container.querySelector<HTMLInputElement>('#name-search')!
  const shellHeading = text(container.querySelector('.hero-copy h1'))
  const shellSubtitle = text(container.querySelector('.hero-copy p'))
  expect(shellHeading).toBe('Find your .dusk name')

  shellInput.focus()
  shellInput.value = 'pi'
  watchStaticShell(container)
  shellInput.value = 'pie'
  shellInput.dispatchEvent(new Event('input', { bubbles: true }))

  const root = createRoot(container)
  try {
    await act(async () => { root.render(createElement(App)) })
    const input = container.querySelector<HTMLInputElement>('#name-search')!
    expect(input).not.toBe(shellInput)
    expect(shellInput.isConnected).toBe(false)
    expect(document.activeElement).toBe(input)
    expect(input.value).toBe('pie')
    expect(container.hasAttribute('data-static-shell')).toBe(false)
    expect(text(container.querySelector('.hero-copy h1'))).toBe(shellHeading)
    expect(text(container.querySelector('.hero-copy p'))).toBe(shellSubtitle)
  } finally {
    await act(async () => { root.unmount() })
  }
}, 120_000)

function mountShell() {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const page = injectStaticShell(readFileSync(resolve('index.html'), 'utf8'), readFileSync(staticShellFile, 'utf8'))
  document.body.innerHTML = /<body>([\s\S]*)<\/body>/.exec(page)![1].replace(/<script[\s\S]*?<\/script>/g, '')
  return document.getElementById('root')!
}

it('keeps typed text when focus moved to a link before the app mounted', async () => {
  const container = mountShell()
  watchStaticShell(container)
  const shellInput = container.querySelector<HTMLInputElement>('#name-search')!
  shellInput.focus()
  shellInput.value = 'pie'
  shellInput.dispatchEvent(new Event('input', { bubbles: true }))
  container.querySelector<HTMLAnchorElement>('a[href="/market"]')!.focus()

  const root = createRoot(container)
  try {
    await act(async () => { root.render(createElement(App)) })
    expect(document.activeElement).toBe(container.querySelector('a[href="/market"]'))
    expect(container.querySelector<HTMLInputElement>('#name-search')!.value).toBe('pie')
  } finally {
    await act(async () => { root.unmount() })
  }
}, 120_000)

it('keeps typed text under Strict Mode, which runs the effects twice', async () => {
  const container = mountShell()
  // Typed before the app's script ran, with nothing listening yet.
  const shellInput = container.querySelector<HTMLInputElement>('#name-search')!
  shellInput.focus()
  shellInput.value = 'pie'
  watchStaticShell(container)

  const root = createRoot(container)
  try {
    await act(async () => { root.render(createElement(StrictMode, null, createElement(App))) })
    const input = container.querySelector<HTMLInputElement>('#name-search')!
    expect(document.activeElement).toBe(input)
    expect(input.value).toBe('pie')
  } finally {
    await act(async () => { root.unmount() })
  }
}, 120_000)

it('keeps a selection made in the search box before the app mounted', async () => {
  const container = mountShell()
  const shellInput = container.querySelector<HTMLInputElement>('#name-search')!
  shellInput.focus()
  shellInput.value = 'pie'
  shellInput.setSelectionRange(0, 2)
  watchStaticShell(container)

  const root = createRoot(container)
  try {
    await act(async () => { root.render(createElement(StrictMode, null, createElement(App))) })
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)) })
    const input = container.querySelector<HTMLInputElement>('#name-search')!
    expect(input.value).toBe('pie')
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, 2])
  } finally {
    await act(async () => { root.unmount() })
  }
}, 120_000)
