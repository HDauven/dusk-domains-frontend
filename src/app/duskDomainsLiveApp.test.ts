import { readFileSync } from 'node:fs'
import { afterEach, expect, it, vi } from 'vitest'
import { announceDuskProvider, DuskWallet, type DuskProvider } from '@dusk/connect'
import { DUSK_DOMAINS_CONTRACTS, type DuskDomainsRuntimeConfig } from '../names/internal'
import { createWalletSession } from '../features/wallet/walletSession'
import { createDuskDomainsLiveApp } from './duskDomainsLiveApp'

const cleanups: Array<() => void> = []
afterEach(() => { cleanups.splice(0).forEach(cleanup => cleanup()); vi.unstubAllGlobals() })

async function fixture(chainId = 'dusk:2') {
  vi.stubGlobal('window', new EventTarget())
  const driver = readFileSync('public/contracts/dusk-domains-core.data-driver.wasm')
  vi.stubGlobal('fetch', vi.fn(async () => new Response(driver)))
  const listeners = new Map<string, Set<(value: unknown) => void>>()
  const provider = {
    isDusk: true, isAuthorized: true, chainId, profiles: [{ account: 'A', profileId: 'primary' }],
    on(event: string, callback: (value: unknown) => void) {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event)!.add(callback)
    },
    off(event: string, callback: (value: unknown) => void) { listeners.get(event)?.delete(callback) },
    request: vi.fn(async ({ method }: { method: string }): Promise<unknown> => {
      if (method === 'dusk_profiles') return provider.profiles
      if (method === 'dusk_chainId') return provider.chainId
      if (method === 'dusk_disconnect') throw new Error('Revocation unavailable')
      if (method === 'dusk_sendTransaction') return { hash: 'ab'.repeat(32), nonce: '1' }
      return null
    }),
  }
  const info = { uuid: 'wallet', name: 'Wallet', rdns: 'test.wallet', icon: '' }
  const base = new DuskWallet({ provider: provider as unknown as DuskProvider, providerInfo: info, autoRefresh: false, rememberLastUsedProvider: false })
  const session = createWalletSession(base)
  cleanups.push(session.destroy)
  const emit = (event: string, value?: unknown) => listeners.get(event)?.forEach(callback => callback(value))
  emit('duskNodeChanged', { chainId, nodeUrl: 'http://127.0.0.1:18181/' })
  await session.ready()
  await session.refresh()
  const contracts = Object.fromEntries(Object.entries(DUSK_DOMAINS_CONTRACTS).map(([key, value]) => [key, { ...value, contractId: `0x${'11'.repeat(32)}` }]))
  const runtimeConfig = { liveWritesEnabled: true, contracts, chainId, nodeUrl: 'http://127.0.0.1:18181/' } as DuskDomainsRuntimeConfig
  const { names } = createDuskDomainsLiveApp({ runtimeConfig, wallet: base, session, autoConnect: false })
  const write = () => names.writeContract({ contract: contracts.core, functionName: 'commit_runtime', args: { commitment: Array(32).fill(1) } })
  provider.request.mockClear()
  return { provider, session, emit, write, info, names }
}

it('keeps the wallet chain live through the app wrapper', async () => {
  const { names, provider, emit } = await fixture()
  expect(names.chainId).toBe('dusk:2')
  provider.chainId = 'dusk:1'
  emit('chainChanged', provider.chainId)
  expect(names.chainId).toBe('dusk:1')
})

it.each(['dusk:0', 'dusk:2'])('sends an unchanged %s session through installed connect and its data driver', async chain => {
  const { provider, write } = await fixture(chain)
  await expect(write()).resolves.toMatchObject({ hash: 'ab'.repeat(32) })
  const sends = provider.request.mock.calls.filter(([args]) => args.method === 'dusk_sendTransaction')
  expect(sends).toHaveLength(1)
  expect(sends[0][0]).toMatchObject({ params: { kind: 'contract_call', fnName: 'commit_runtime', fnArgs: expect.any(String) } })
  expect(provider.request.mock.calls.some(([args]) => args.method === 'dusk_switchNetwork')).toBe(false)
})

it.each(['lock', 'disconnect', 'network', 'account', 'profile', 'authorization', 'node', 'encoding', 'announcement'])('refuses %s during installed connect preparation at the provider boundary', async change => {
  const { provider, session, emit, write, info } = await fixture(change === 'node' ? 'dusk:0' : 'dusk:2')
  const delayed = Promise.withResolvers<unknown>()
  const request = provider.request.getMockImplementation()!
  let waiting = false
  let chainReads = 0
  if (change === 'encoding') vi.mocked(fetch).mockImplementationOnce(() => { waiting = true; return delayed.promise as Promise<Response> })
  else provider.request.mockImplementation(args => {
    // Network: delay the second chain read, after ensureChain's refresh.
    if (!waiting && (change === 'network' ? args.method === 'dusk_chainId' && ++chainReads === 2 : args.method === 'dusk_profiles')) {
      waiting = true
      return delayed.promise
    }
    return request(args)
  })
  const result = expect(write()).rejects.toThrow('wallet session changed')
  await vi.waitFor(() => expect(waiting).toBe(true))
  if (change === 'disconnect') await expect(session.disconnect()).rejects.toThrow('Revocation unavailable')
  else if (change === 'network') { provider.chainId = 'dusk:1'; emit('chainChanged', provider.chainId) }
  else if (change === 'node') emit('duskNodeChanged', { chainId: 'dusk:0', nodeUrl: 'http://localhost:18181/' })
  else if (change === 'authorization') { provider.isAuthorized = false; emit('disconnect') }
  else {
    if (change === 'announcement') announceDuskProvider({ provider: provider as unknown as DuskProvider, info })
    provider.profiles = change === 'account' ? [{ account: 'B', profileId: 'primary' }]
      : change === 'profile' ? [{ account: 'A', profileId: 'other' }] : []
    emit(change === 'lock' ? 'lock' : 'profilesChanged', provider.profiles)
  }
  await session.refresh()
  if (change === 'encoding') delayed.resolve(new Response(readFileSync('public/contracts/dusk-domains-core.data-driver.wasm')))
  else delayed.resolve(change === 'network' ? 'dusk:2' : [{ account: 'A', profileId: 'primary' }])
  await result
  expect(provider.request.mock.calls.filter(([args]) => args.method === 'dusk_sendTransaction')).toEqual([])
})

it.each(['profiles', 'encoding'])('rejects a return to the same account during installed connect %s preparation', async stage => {
  const { provider, session, emit, write } = await fixture()
  const delayed = Promise.withResolvers<unknown>()
  const request = provider.request.getMockImplementation()!
  let waiting = false
  if (stage === 'encoding') vi.mocked(fetch).mockImplementationOnce(() => { waiting = true; return delayed.promise as Promise<Response> })
  else provider.request.mockImplementation(args => {
    if (!waiting && args.method === 'dusk_profiles') { waiting = true; return delayed.promise }
    return request(args)
  })
  const outcome = write().then(() => 'sent', error => error.message)
  await vi.waitFor(() => expect(waiting).toBe(true))
  for (const account of ['B', 'A']) {
    provider.profiles = [{ account, profileId: 'primary' }]
    emit('profilesChanged', provider.profiles)
    await session.refresh()
  }
  delayed.resolve(stage === 'encoding' ? new Response(readFileSync('public/contracts/dusk-domains-core.data-driver.wasm')) : provider.profiles)
  expect(await outcome).toContain('wallet session changed')
  expect(provider.request.mock.calls.filter(([args]) => args.method === 'dusk_sendTransaction')).toEqual([])
})
