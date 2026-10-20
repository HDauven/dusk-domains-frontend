import { afterEach, expect, it, vi } from 'vitest'
import { ContractRefusedError, type ContractRole } from '@duskdomains/sdk'
import { handoff, handoffDriver, handoffEnv, handoffNodeReply } from '../test/handoffFixtures'
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

const replacement = '0b'.repeat(32)
// The live app with the real handoff manifest and drivers. The node answers verification reads, and
// reports the interface `kinds` names for a contract, such as a replacement that isn't a policy.
function liveApp(kinds: Record<string, string> = {}) {
  const manifest = structuredClone(handoff)
  const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input))
    const node = handoffNodeReply(url, kinds, init?.body)
    if (node) return node
    if (url.pathname === '/releases/local/manifest.json') return new Response(JSON.stringify(manifest))
    const role = roles.find(role => url.pathname === `/releases/local/${handoff.artifacts[role].driver.path}` || url.pathname === `/${handoff.artifacts[role].driver.path}`)
    if (role) return new Response(handoffDriver(role as ContractRole) as BodyInit)
    throw new Error(`Unexpected network request: ${url}`)
  })
  vi.stubGlobal('fetch', fetcher)
  const dispatchEvent = vi.fn()
  vi.stubGlobal('dispatchEvent', dispatchEvent)
  const runtimeConfig = createDuskDomainsRuntimeConfig({ ...handoffEnv, VITE_DUSK_DOMAINS_INDEXER_URL: '/api', VITE_DUSK_DOMAINS_MANIFEST_URL: '/releases/local/manifest.json' })
  const { names } = createDuskDomainsLiveApp({ runtimeConfig, wallet: { state: { chainId: 'dusk:0' } } as never, session: { state: {} } as never })
  // The operator republishes the manifest to list a replacement policy.
  const republish = () => manifest.contracts.push({ ...manifest.contracts.find((c: { key: string }) => c.key === 'policy'), id: replacement })
  return { names, republish, dispatchEvent }
}

// The replacement is listed, but its node read fails: nothing was decided about it.
it('keeps the client when a contract’s verification read fails, and leaves it out of the release', async () => {
  const { names, republish, dispatchEvent } = liveApp()
  const client = await names.client!
  republish()
  await expect(client.verifyContract('policy', replacement)).rejects.toThrow('Unexpected network request')
  expect(client.release.contracts.has(replacement)).toBe(false)
  expect(dispatchEvent).not.toHaveBeenCalled()
  expect(await names.client!).toBe(client)
})

// The replacement is listed, but the chain reports another interface: the client refuses it for good.
it.each([
  ['verifying it', (client: Awaited<ReturnType<typeof liveApp>['names']['client']>) => client!.verifyContract('policy', replacement)],
  ['reading through it', (client: Awaited<ReturnType<typeof liveApp>['names']['client']>) => client!.policy(replacement).config()],
])('discards a client that refuses a contract while %s, and creates a fresh one', async (_, read) => {
  const { names, republish, dispatchEvent } = liveApp({ [replacement]: 'store' })
  const client = await names.client!
  expect(names.isCurrentClient?.(client)).toBe(true)
  republish()
  await expect(read(client)).rejects.toBeInstanceOf(ContractRefusedError)
  expect(dispatchEvent).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ type: 'dusk-domains:client-reset' }))
  expect(names.isCurrentClient?.(client)).toBe(false)
  const next = await names.client!
  expect(next).not.toBe(client)
  expect(next.release).not.toBe(client.release)
  // The new release holds what the manifest lists now, and nothing is verified yet.
  expect(next.release.contracts.has(replacement)).toBe(true)
  expect(names.isCurrentClient?.(next)).toBe(true)
  // A client whose verifications pass is kept.
  expect(await names.client!).toBe(next)
})

it('keeps the client after refusing a contract the manifest doesn’t list, which leaves its release untouched', async () => {
  const { names } = liveApp()
  const client = await names.client!
  await expect(client.verifyContract('policy', replacement)).rejects.toThrow('not been updated')
  expect(client.release.contracts.has(replacement)).toBe(false)
  expect(client.release.drivers.has(replacement)).toBe(false)
  expect(await names.client!).toBe(client)
})
