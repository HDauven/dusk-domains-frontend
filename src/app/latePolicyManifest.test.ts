import { afterEach, expect, it, vi } from 'vitest'
import { FrozenClient, type ContractRole } from '@duskdomains/sdk'
import { handoff, handoffDriver, handoffEnv, handoffNodeReply } from '../test/handoffFixtures'
import { createDuskDomainsRuntimeConfig, roles } from '../names/config'
import { createDuskDomainsLiveApp } from './duskDomainsLiveApp'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// A SetPolicy executed, and the directory selects a policy this site's manifest doesn't list yet.
const selected = '0b'.repeat(32)

// The live app with the real handoff manifest and drivers. The node answers the directory's
// verification; it is asked for nothing else.
function liveApp() {
  const manifest = structuredClone(handoff)
  const nodeReads: string[] = []
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input))
    const node = handoffNodeReply(url)
    if (node) {
      nodeReads.push(url.pathname.split('/').pop()!)
      return node
    }
    if (url.pathname === '/releases/local/manifest.json') return new Response(JSON.stringify(manifest))
    const role = roles.find(role => url.pathname === `/releases/local/${handoff.artifacts[role].driver.path}` || url.pathname === `/${handoff.artifacts[role].driver.path}`)
    if (role) return new Response(handoffDriver(role as ContractRole) as BodyInit)
    throw new Error(`Unexpected network request: ${url}`)
  }))
  const dispatchEvent = vi.fn()
  vi.stubGlobal('dispatchEvent', dispatchEvent)
  const runtimeConfig = createDuskDomainsRuntimeConfig({ ...handoffEnv, VITE_DUSK_DOMAINS_INDEXER_URL: '/api', VITE_DUSK_DOMAINS_MANIFEST_URL: '/releases/local/manifest.json' })
  const { names } = createDuskDomainsLiveApp({ runtimeConfig, wallet: { state: { chainId: 'dusk:0' } } as never, session: { state: {} } as never })
  return { names, dispatchEvent, nodeReads }
}

it('creates the client without reading the policy the directory selects', async () => {
  const { names, nodeReads } = liveApp()
  const client = await names.client!
  expect(client).toBeInstanceOf(FrozenClient)
  // Only the directory is verified: renewals, records and the market never need the selected policy.
  expect(nodeReads).toEqual(['interface_version', 'binding'])
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
