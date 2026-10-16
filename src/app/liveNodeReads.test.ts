// How the live app's client reads the node through the SDK 0.3.2 bridge (names/sharedReads.ts).
// Delete with the bridge.
import { afterEach, expect, it, vi } from 'vitest'
import { contractId, FrozenClient, type ContractRole } from '@duskdomains/sdk'
import { handoff, handoffDriver, handoffEnv } from '../test/handoffFixtures'
import { createDuskDomainsRuntimeConfig, roles } from '../names/config'
import { createDuskDomainsLiveApp } from './duskDomainsLiveApp'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function memoryStorage() {
  const memory = new Map<string, string>()
  return {
    memory,
    get length() { return memory.size },
    key: (index: number) => [...memory.keys()][index] ?? null,
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => { memory.set(key, value) },
    removeItem: (key: string) => { memory.delete(key) },
  }
}

// The live app with the real handoff manifest and drivers, on a node that logs what it is asked.
function liveApp(storage: unknown = memoryStorage()) {
  vi.spyOn(FrozenClient.prototype, 'discover').mockResolvedValue({} as never)
  const manifest = structuredClone(handoff)
  const node: string[] = []
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input))
    if (url.pathname === '/releases/local/manifest.json') return new Response(JSON.stringify(manifest))
    const role = roles.find((role) => url.pathname === `/releases/local/${handoff.artifacts[role].driver.path}` || url.pathname === `/${handoff.artifacts[role].driver.path}`)
    if (role) return new Response(handoffDriver(role as ContractRole) as BodyInit)
    if (url.origin === 'http://127.0.0.1:18184' && url.pathname === '/on/graphql/query') {
      node.push('height')
      return new Response(JSON.stringify({ block: { header: { height: 1234 } } }))
    }
    const read = /^\/on\/contracts:([0-9a-f]{64})\/(\w+)$/.exec(url.pathname)
    if (url.origin === 'http://127.0.0.1:18184' && read) {
      node.push(read[2]!)
      return new Response(Uint8Array.of(node.length))
    }
    throw new Error(`Unexpected network request: ${url}`)
  }))
  vi.stubGlobal('sessionStorage', storage)
  const runtimeConfig = createDuskDomainsRuntimeConfig({ ...handoffEnv, VITE_DUSK_DOMAINS_INDEXER_URL: '/api', VITE_DUSK_DOMAINS_MANIFEST_URL: '/releases/local/manifest.json' })
  const { names } = createDuskDomainsLiveApp({ runtimeConfig, wallet: { state: { chainId: 'dusk:0' } } as never, session: { state: {} } as never })
  return { names, node, manifest }
}
const directory = contractId(handoff.contracts.find((c: { key: string }) => c.key === 'directory').id)
const asked = (node: string[], method: string) => node.filter((entry) => entry === method).length

it('asks the node once for a contract read repeated at one height', async () => {
  const { names, node } = liveApp()
  const client = await names.client!
  expect(await client.transport.currentBlockHeight()).toBe(1234n)
  const first = await client.transport.read(directory, 'members', Uint8Array.of(1))
  expect(await client.transport.read(directory, 'members', Uint8Array.of(1))).toEqual(first)
  expect(asked(node, 'members')).toBe(1)
  // Heights are never answered from memory.
  await client.transport.currentBlockHeight()
  expect(asked(node, 'height')).toBe(2)
})

it('verifies contracts after a reload with the interface and binding replies this tab already read', async () => {
  const storage = memoryStorage()
  const first = liveApp(storage)
  const client = await first.names.client!
  const binding = await client.transport.read(directory, 'binding', Uint8Array.of(0))
  vi.restoreAllMocks()
  const reload = liveApp(storage)
  const next = await reload.names.client!
  expect(next).not.toBe(client)
  expect(await next.transport.read(directory, 'binding', Uint8Array.of(0))).toEqual(binding)
  expect(asked(reload.node, 'binding')).toBe(0)
  // What can change is read again.
  await next.transport.currentBlockHeight()
  await next.transport.read(directory, 'members', Uint8Array.of(1))
  expect(asked(reload.node, 'members')).toBe(1)
})

it('reads verification replies from the node again after it discards a client', async () => {
  const storage = memoryStorage()
  const { names, node, manifest } = liveApp(storage)
  const client = await names.client!
  await client.transport.read(directory, 'binding', Uint8Array.of(0))
  // A contract fails verification after its driver loaded: the client and its release are discarded.
  const replacement = '0b'.repeat(32)
  manifest.contracts.push({ ...manifest.contracts.find((c: { key: string }) => c.key === 'policy'), id: replacement })
  await expect(client.verifyContract('policy', replacement)).rejects.toThrow()
  expect(storage.memory.size).toBe(0)
  const next = await names.client!
  expect(next).not.toBe(client)
  await next.transport.read(directory, 'binding', Uint8Array.of(0))
  expect(asked(node, 'binding')).toBe(2)
})

it('creates its client from a manifest carrying fields the SDK’s JSON can’t write, such as a decimal', async () => {
  const { names, node, manifest } = liveApp()
  manifest.gasPriceDusk = 0.000000001
  const client = await names.client!
  await client.transport.read(directory, 'binding', Uint8Array.of(0))
  expect(asked(node, 'binding')).toBe(1)
})

it('reads every reply from the node when session storage is unavailable', async () => {
  const { names, node } = liveApp({
    get length(): number { throw new Error('SecurityError') },
    key: () => { throw new Error('SecurityError') },
    getItem: () => { throw new Error('SecurityError') },
    setItem: () => { throw new Error('SecurityError') },
    removeItem: () => { throw new Error('SecurityError') },
  })
  const client = await names.client!
  await client.transport.currentBlockHeight()
  const binding = await client.transport.read(directory, 'binding', Uint8Array.of(0))
  expect(await client.transport.read(directory, 'binding', Uint8Array.of(0))).toEqual(binding)
  expect(asked(node, 'binding')).toBe(1)
})
