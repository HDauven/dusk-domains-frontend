import { afterEach, expect, it, vi } from 'vitest'
import { FrozenClient, type ContractRole } from '@duskdomains/sdk'
import { handoff, handoffDriver, handoffEnv } from '../test/handoffFixtures'
import { createDuskDomainsRuntimeConfig, roles } from '../names/config'
import { createDuskDomainsOnChainClient, createDuskDomainsOnChainReadTransport, type DuskConnectAppLike } from '../names/internal'
import { contracts } from '../test/frozenFixtures'
import { createDuskDomainsLiveApp } from './duskDomainsLiveApp'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it('reads through a client created after an earlier creation failed, without a reload', async () => {
  // The first creation fails, as when the manifest doesn't list a contract the chain now uses; the
  // operator then publishes the fix.
  let attempts = 0
  const created = { transport: { currentBlockHeight: async () => 1234n } }
  const app = {
    get client() {
      attempts++
      return attempts === 1 ? Promise.reject(new Error('This site has not been updated for the new marketplace yet. Try again later.')) : Promise.resolve(created)
    },
  } as unknown as DuskConnectAppLike
  const onChain = createDuskDomainsOnChainClient({ read: createDuskDomainsOnChainReadTransport(app, contracts) })
  const first = await onChain.getCurrentBlockHeight()
  expect(first).toMatchObject({ ok: false, error: { message: 'This site has not been updated for the new marketplace yet. Try again later.' } })
  expect(await onChain.getCurrentBlockHeight()).toEqual({ ok: true, value: 1234 })
})

// The live app with the real handoff manifest and drivers, without a node.
function liveApp() {
  vi.spyOn(FrozenClient.prototype, 'discover').mockResolvedValue({} as never)
  const manifest = structuredClone(handoff)
  const fetcher = vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input))
    if (url.pathname === '/releases/local/manifest.json') return new Response(JSON.stringify(manifest))
    const role = roles.find(role => url.pathname === `/releases/local/${handoff.artifacts[role].driver.path}` || url.pathname === `/${handoff.artifacts[role].driver.path}`)
    if (role) return new Response(handoffDriver(role as ContractRole) as BodyInit)
    throw new Error(`Unexpected network request: ${url}`)
  })
  vi.stubGlobal('fetch', fetcher)
  const runtimeConfig = createDuskDomainsRuntimeConfig({ ...handoffEnv, VITE_DUSK_DOMAINS_INDEXER_URL: '/api', VITE_DUSK_DOMAINS_MANIFEST_URL: '/releases/local/manifest.json' })
  const { names } = createDuskDomainsLiveApp({ runtimeConfig, wallet: { state: { chainId: 'dusk:0' } } as never, session: { state: {} } as never })
  return { names, manifest }
}
const policyEntry = (manifest: typeof handoff, id: string) => ({ ...manifest.contracts.find((c: { key: string }) => c.key === 'policy'), id })

// The manifest was republished to list the contract: its reviewed driver loads into the release,
// but the contract itself then fails verification (here its node read fails).
it('discards the client and its release after a contract fails verification after its driver loaded, and creates a fresh one', async () => {
  const { names, manifest } = liveApp()
  const replacement = '0b'.repeat(32)
  const client = await names.client!
  manifest.contracts.push(policyEntry(manifest, replacement))
  await expect(client.verifyContract('policy', replacement)).rejects.toThrow('Unexpected network request')
  // The failed verification left its descriptor and driver behind in the old release.
  expect(client.release.drivers.has(replacement)).toBe(true)
  const next = await names.client!
  expect(next).not.toBe(client)
  expect(next.release).not.toBe(client.release)
  // The new release holds what the manifest lists now, and nothing is verified yet.
  expect(next.release.contracts.has(replacement)).toBe(true)
  // A client whose verifications pass is kept.
  expect(await names.client!).toBe(next)
})

it('keeps the client after refusing a contract the manifest doesn’t list, which leaves its release untouched', async () => {
  const { names } = liveApp()
  const unlisted = '0b'.repeat(32)
  const client = await names.client!
  await expect(client.verifyContract('policy', unlisted)).rejects.toThrow('not been updated')
  expect(client.release.contracts.has(unlisted)).toBe(false)
  expect(client.release.drivers.has(unlisted)).toBe(false)
  expect(await names.client!).toBe(client)
})

it('tells readers holding a discarded client that it is no longer current', async () => {
  const { names, manifest } = liveApp()
  const dispatchEvent = vi.fn()
  vi.stubGlobal('dispatchEvent', dispatchEvent)
  const client = await names.client!
  expect(names.isCurrentClient?.(client)).toBe(true)
  manifest.contracts.push(policyEntry(manifest, '0b'.repeat(32)))
  await expect(client.verifyContract('policy', '0b'.repeat(32))).rejects.toThrow()
  expect(dispatchEvent).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ type: 'dusk-domains:client-reset' }))
  expect(names.isCurrentClient?.(client)).toBe(false)
  const next = await names.client!
  expect(names.isCurrentClient?.(next)).toBe(true)
  expect(names.isCurrentClient?.(client)).toBe(false)
})
