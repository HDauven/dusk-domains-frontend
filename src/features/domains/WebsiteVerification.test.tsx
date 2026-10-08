// @vitest-environment happy-dom
import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, expect, it, vi } from 'vitest'
import { WebsiteVerificationPanel } from './settings/WebsiteVerificationPanel'
import { WebsiteBadge } from '../../components/ui/WebsiteBadge'
import { NameHeader } from '../search/NameHeader'
import { ListingName } from '../marketplace/ListingName'
import { NameCard } from './my-domains/NameCard'
import { createDuskDomainsIndexerClient, type WebsiteVerification } from '../../names/internal'
import { boundWebsiteVerification, isWebsiteVerification } from '../../names/http/verification'

vi.mock('../../components/ui/nameFitter', () => ({ registerName: () => () => {} }))
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers() })
const owner = `0x${'ab'.repeat(32)}`
const verified: WebsiteVerification = { domain: 'harbourline.com', status: 'verified', checkedAt: new Date().toISOString(), dnssec: false }
const props = { name: 'aurora.dusk', owner, website: 'https://harbourline.com/about', verification: verified, onCheck: async () => {} }

it.each(['unverified', 'mismatch', 'checking', 'verified', 'retry'] as const)('shows a badge only for verified website status (%s)', status => {
  const verification = { ...verified, status }
  const views = [
    <WebsiteBadge verification={verification} />,
    <NameHeader displayName="aurora.dusk" lifecycleLabel={null} primaryVerified records={[]} reserved={false} status="registered" verification={verification} />,
    <ListingName name="aurora.dusk" verification={verification} />,
    <NameCard name={{ canonicalName: 'aurora.dusk', records: [], expiresAt: null, status: 'active', verification } as never} currentBlockHeight={10} onOpen={() => {}} primary={undefined} selectedAddress="" />,
  ]
  for (const view of views) expect(renderToStaticMarkup(view).includes('Verified · harbourline.com')).toBe(status === 'verified')
})

it('does not turn primary status, a description, or malformed website data into a website badge', () => {
  expect(renderToStaticMarkup(<WebsiteBadge verification={undefined} />)).toBe('')
  expect(renderToStaticMarkup(<WebsiteBadge verification={{ ...verified, domain: null }} />)).toBe('')
  const html = renderToStaticMarkup(<NameHeader displayName="aurora.dusk" lifecycleLabel={null} primaryVerified
    records={[{ key: 'text.description', value: 'Official', visibility: 'public', ttlSeconds: 300, updatedAt: '' }]} reserved={false} status="registered" />)
  expect(html).toContain('Official')
  expect(html).not.toContain('Verified ·')
})

it.each([
  ['checking', 'Checking…'], ['verified', 'Verified · harbourline.com'],
  ['unverified', 'Not found'], ['mismatch', 'Doesn’t match'], ['retry', 'Try again'],
] as const)('explains panel state %s and shows the exact TXT value', (status, label) => {
  const html = renderToStaticMarkup(<WebsiteVerificationPanel {...props} verification={{ ...verified, status }} />)
  expect(html).toContain(label)
  expect(html).toContain('_dusk-domains.harbourline.com')
  expect(html).toContain(`dusk-domains-verification=aurora.dusk;owner=${owner}`)
  expect(html).toContain('Check now')
})

it('asks for a website when missing and rejects a website with a port', () => {
  for (const website of ['', 'https://harbourline.com:443']) {
    const html = renderToStaticMarkup(<WebsiteVerificationPanel {...props} website={website} />)
    expect(html).toContain(website ? 'valid HTTPS website' : 'Website record missing')
    expect(html).not.toContain('dusk-domains-verification=')
    expect(html).not.toContain('Verified ·')
  }
})

it('copies the current owner value, checks through POST, and displays pending and final status', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const copy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
  let finish!: (response: Response) => void
  const fetcher = vi.fn(() => new Promise<Response>(resolve => { finish = resolve }))
  const client = createDuskDomainsIndexerClient({ baseUrl: 'https://indexer.example', fetch: fetcher })
  const container = document.createElement('div'), root = createRoot(container)
  try {
    function Probe() {
      const [verification, setVerification] = useState<WebsiteVerification>()
      return <WebsiteVerificationPanel {...props} verification={verification} onCheck={async () => {
        setVerification(await client.verifyWebsite(props.name))
      }} />
    }
    await act(async () => root.render(<Probe />))
    await act(async () => (container.querySelector('[aria-label="Copy TXT value"]') as HTMLButtonElement).click())
    expect(copy).toHaveBeenCalledWith(`dusk-domains-verification=aurora.dusk;owner=${owner}`)
    await act(async () => [...container.querySelectorAll('button')].find(button => button.textContent === 'Check now')!.click())
    expect(container.textContent).toContain('Checking…')
    expect(fetcher).toHaveBeenCalledWith('https://indexer.example/verify?name=aurora.dusk', expect.objectContaining({ method: 'POST' }))
    await act(async () => finish(Response.json({ canonicalName: 'aurora.dusk', verification: verified })))
    expect(container.textContent).toContain('Verified · harbourline.com')
    await act(async () => root.render(<WebsiteVerificationPanel {...props} owner="new-owner" verification={undefined} />))
    expect(container.textContent).not.toContain('Verified ·')
    expect(container.textContent).toContain('owner=new-owner')
  } finally { await act(async () => root.unmount()) }
})

it('rejects mismatched or malformed verification responses and reports rate limits', async () => {
  for (const body of [{ canonicalName: 'other.dusk', verification: verified }, { canonicalName: 'aurora.dusk', verification: { status: 'verified' } }]) {
    const client = createDuskDomainsIndexerClient({ baseUrl: 'https://indexer.example', fetch: async () => Response.json(body) })
    await expect(client.verifyWebsite('aurora.dusk')).rejects.toThrow()
  }
  const client = createDuskDomainsIndexerClient({ baseUrl: 'https://indexer.example', fetch: async () => Response.json({}, { status: 429, headers: { 'retry-after': '60' } }) })
  await expect(client.verifyWebsite('aurora.dusk')).rejects.toThrow('60 seconds')
})

it('clears hydrated verification when the owner or saved website changes', () => {
  const state = { owner, websiteVerification: { owner, website: props.website, result: verified } }
  expect(boundWebsiteVerification(state, props.website)).toEqual(verified)
  expect(boundWebsiteVerification({ ...state, owner: 'other' }, props.website)).toBeUndefined()
  expect(boundWebsiteVerification(state, props.website + '/changed')).toBeUndefined()
})

it('keeps ordinary names without DNS proof quiet: no verified mark and no unverified label', () => {
  const html = renderToStaticMarkup(<NameHeader displayName="aurora.dusk" lifecycleLabel={null} primaryVerified={false} records={[]} reserved={false} status="registered" />)
  expect(html).not.toContain('Verified')
  expect(html).not.toContain('nverified')
})

it('keeps a check pending during parent refresh and ignores results after changing names', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  let resolvePending!: () => void
  const pending = new Promise<void>(resolve => { resolvePending = resolve })
  const container = document.createElement('div'), root = createRoot(container)
  try {
    await act(async () => root.render(<WebsiteVerificationPanel {...props} onCheck={() => pending} />))
    await act(async () => [...container.querySelectorAll('button')].find(button => button.textContent === 'Check now')!.click())
    await act(async () => root.render(<WebsiteVerificationPanel {...props} verification={undefined} onCheck={() => pending} />))
    expect(container.textContent).toContain('Checking…')
    await act(async () => root.render(<WebsiteVerificationPanel {...props} name="other.dusk" verification={undefined} />))
    await act(async () => resolvePending())
    expect(container.textContent).not.toContain('Verified ·')
    expect(container.textContent).toContain('verification=other.dusk')
  } finally { await act(async () => root.unmount()) }
})

it('shows a failed check and supersedes a manual result when refreshed DNS no longer matches', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const container = document.createElement('div'), root = createRoot(container)
  const check = vi.fn(async () => { root.render(<WebsiteVerificationPanel {...props} onCheck={check} />) })
  try {
    await act(async () => root.render(<WebsiteVerificationPanel {...props} verification={undefined} onCheck={check} />))
    await act(async () => [...container.querySelectorAll('button')].find(button => button.textContent === 'Check now')!.click())
    expect(container.textContent).toContain('Verified ·')
    await act(async () => root.render(<WebsiteVerificationPanel {...props} verification={{ ...verified, status: 'mismatch' }} onCheck={check} />))
    expect(container.textContent).toContain('Doesn’t match')
    expect(container.textContent).not.toContain('Verified ·')
    check.mockRejectedValueOnce(new Error('Could not check DNS'))
    await act(async () => [...container.querySelectorAll('button')].find(button => button.textContent === 'Check now')!.click())
    expect(container.textContent).toContain('Could not check DNS')
    expect(container.textContent).not.toContain('Verified ·')
  } finally { await act(async () => root.unmount()) }
})

it.each(['checking', 'manual'] as const)('polls %s checks every five seconds and recovers after sixty seconds', async mode => {
  vi.useFakeTimers()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const refresh = vi.fn(async () => {})
  const check = vi.fn(async () => { await new Promise(() => {}) })
  const container = document.createElement('div'), root = createRoot(container)
  const button = () => [...container.querySelectorAll('button')].find(button => button.textContent === 'Check now')!
  const panel = () => <WebsiteVerificationPanel {...props} verification={mode === 'checking' ? { ...verified, status: 'checking' } : undefined}
    onCheck={check} onRefresh={() => refresh()} />
  try {
    await act(async () => root.render(panel()))
    if (mode === 'manual') await act(async () => button().click())
    expect(button().disabled).toBe(true)
    await act(async () => vi.advanceTimersByTimeAsync(4999))
    expect(refresh).not.toHaveBeenCalled()
    await act(async () => vi.advanceTimersByTimeAsync(1))
    expect(refresh).toHaveBeenCalledOnce()
    // Parent rerenders with a new callback must not restart the deadline or cadence.
    await act(async () => root.render(panel()))
    for (let seconds = 10; seconds <= 55; seconds += 5) {
      await act(async () => vi.advanceTimersByTimeAsync(5000))
      expect(refresh).toHaveBeenCalledTimes(seconds / 5)
      expect(button().disabled).toBe(true)
    }
    await act(async () => vi.advanceTimersByTimeAsync(5000))
    expect(button().disabled).toBe(false)
    expect(container.textContent).toContain('Try again')
    const calls = refresh.mock.calls.length
    await act(async () => vi.advanceTimersByTimeAsync(60_000))
    expect(refresh).toHaveBeenCalledTimes(calls)
    await act(async () => button().click())
    expect(button().disabled).toBe(true)
  } finally { await act(async () => root.unmount()) }
})

it('stops polling when a pending check completes or the binding changes', async () => {
  vi.useFakeTimers()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const refresh = vi.fn(async () => {})
  const container = document.createElement('div'), root = createRoot(container)
  try {
    await act(async () => root.render(<WebsiteVerificationPanel {...props} verification={{ ...verified, status: 'checking' }} onRefresh={refresh} />))
    await act(async () => vi.advanceTimersByTimeAsync(5000))
    expect(refresh).toHaveBeenCalledOnce()
    await act(async () => root.render(<WebsiteVerificationPanel {...props} onRefresh={refresh} />))
    await act(async () => vi.advanceTimersByTimeAsync(60_000))
    expect(refresh).toHaveBeenCalledOnce()
    expect(container.textContent).toContain('Verified ·')
    await act(async () => root.render(<WebsiteVerificationPanel {...props} verification={{ ...verified, status: 'checking' }} onRefresh={refresh} />))
    await act(async () => root.render(<WebsiteVerificationPanel {...props} owner="other-owner" verification={undefined} onRefresh={refresh} />))
    await act(async () => vi.advanceTimersByTimeAsync(60_000))
    expect(refresh).toHaveBeenCalledOnce()
    expect(container.textContent).not.toContain('Verified ·')
  } finally { await act(async () => root.unmount()) }
})

it('shows a capacity failure as try again rather than missing proof', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const client = createDuskDomainsIndexerClient({ baseUrl: 'https://indexer.example', fetch: async () => Response.json({ error: 'verification_busy' }, { status: 503 }) })
  const container = document.createElement('div'), root = createRoot(container)
  try {
    await act(async () => root.render(<WebsiteVerificationPanel {...props} verification={undefined} onCheck={async () => { await client.verifyWebsite(props.name) }} />))
    await act(async () => [...container.querySelectorAll('button')].find(button => button.textContent === 'Check now')!.click())
    expect(container.textContent).toContain('Try again')
    expect(container.textContent).not.toContain('Not found')
    expect(container.textContent).not.toContain('Verified ·')
  } finally { await act(async () => root.unmount()) }
})

it('accepts an evicted verification result as a retry state', () => {
  expect(isWebsiteVerification({ domain: 'harbourline.com', status: 'retry', checkedAt: null, dnssec: false })).toBe(true)
})

it('re-enables Check now at sixty seconds even when the status refresh never resolves', async () => {
  vi.useFakeTimers()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const refresh = vi.fn(async () => { await new Promise(() => {}) })
  const container = document.createElement('div'), root = createRoot(container)
  try {
    await act(async () => root.render(<WebsiteVerificationPanel {...props} verification={{ ...verified, status: 'checking' }} onRefresh={refresh} />))
    await act(async () => vi.advanceTimersByTimeAsync(60_000))
    expect([...container.querySelectorAll('button')].find(button => button.textContent === 'Check now')!.disabled).toBe(false)
    expect(refresh).toHaveBeenCalledOnce()
    expect(container.textContent).toContain('Try again')
  } finally { await act(async () => root.unmount()) }
})
