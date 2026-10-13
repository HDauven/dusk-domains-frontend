import { afterEach, expect, it, vi } from 'vitest'
import { FrozenClient, type ContractRole } from '@duskdomains/sdk'
import { handoff, handoffDriver, handoffEnv } from '../test/handoffFixtures'
import { createDuskDomainsRuntimeConfig, roles } from '../names/config'
import { discoverWithoutPolicy } from '../names/directoryMembers'
import { createDuskDomainsLiveApp } from './duskDomainsLiveApp'

vi.mock('../names/directoryMembers', async (original) => ({
  ...(await original<typeof import('../names/directoryMembers')>()),
  discoverWithoutPolicy: vi.fn(async () => ({})),
}))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.mocked(discoverWithoutPolicy).mockClear()
})

// A SetPolicy executed, and the directory selects a policy this site's manifest doesn't list yet.
const selected = '0b'.repeat(32)

// The live app with the real handoff manifest and drivers, without a node. SDK 0.3.2's discovery
// verifies the policy the directory selects.
function liveApp() {
  vi.spyOn(FrozenClient.prototype, 'discover').mockImplementation(async function (this: FrozenClient) {
    await this.verifyContract('policy', selected)
    return {} as never
  })
  const manifest = structuredClone(handoff)
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input))
    if (url.pathname === '/releases/local/manifest.json') return new Response(JSON.stringify(manifest))
    const role = roles.find(role => url.pathname === `/releases/local/${handoff.artifacts[role].driver.path}` || url.pathname === `/${handoff.artifacts[role].driver.path}`)
    if (role) return new Response(handoffDriver(role as ContractRole) as BodyInit)
    throw new Error(`Unexpected network request: ${url}`)
  }))
  const dispatchEvent = vi.fn()
  vi.stubGlobal('dispatchEvent', dispatchEvent)
  const runtimeConfig = createDuskDomainsRuntimeConfig({ ...handoffEnv, VITE_DUSK_DOMAINS_INDEXER_URL: '/api', VITE_DUSK_DOMAINS_MANIFEST_URL: '/releases/local/manifest.json' })
  const { names } = createDuskDomainsLiveApp({ runtimeConfig, wallet: { state: { chainId: 'dusk:0' } } as never, session: { state: {} } as never })
  return { names, dispatchEvent }
}

it('reads, renews and manages names while the manifest doesn’t list the policy the directory selects', async () => {
  const { names } = liveApp()
  const client = await names.client!
  expect(client).toBeInstanceOf(FrozenClient)
  // Everything but that policy is discovered and verified.
  expect(discoverWithoutPolicy).toHaveBeenCalledExactlyOnceWith(client)
  expect(client.release.contracts.has(selected)).toBe(false)
  expect(await names.client!).toBe(client)
})

it('refuses registration under that policy and keeps the client', async () => {
  const { names, dispatchEvent } = liveApp()
  const client = await names.client!
  await expect(client.verifyContract('policy', selected)).rejects.toThrow('This site has not been updated for the new registration prices yet. Try again later.')
  // Nothing entered the release, so the client stays.
  expect(client.release.contracts.has(selected)).toBe(false)
  expect(dispatchEvent).not.toHaveBeenCalled()
  expect(names.isCurrentClient?.(client)).toBe(true)
  expect(await names.client!).toBe(client)
})
