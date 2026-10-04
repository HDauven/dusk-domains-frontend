import { afterEach, expect, it, vi } from 'vitest'
import { DuskWallet, type DuskProvider, type DuskWalletState } from '@dusk/connect'
import { createWalletSession } from './walletSession'
import { deriveWalletSessionModel, walletConnectionStatus } from './walletStatus'
import { performWalletConnectionAction } from './walletConnectionAction'

const cleanups: Array<() => void> = []
afterEach(() => { cleanups.splice(0).forEach(cleanup => cleanup()); vi.unstubAllGlobals() })

async function fixture(initialProfiles = [{ account: 'A', profileId: 'primary' }]) {
  const listeners = new Map<string, Set<(value: unknown) => void>>()
  const provider = {
    isDusk: true, isAuthorized: true, chainId: 'dusk:0', profiles: initialProfiles,
    on: (event: string, callback: (value: unknown) => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event)!.add(callback)
    },
    off: (event: string, callback: (value: unknown) => void) => { listeners.get(event)?.delete(callback) },
    request: vi.fn(async ({ method }: { method: string }): Promise<unknown> => {
      if (method === 'dusk_chainId') return provider.chainId
      if (method === 'dusk_profiles') return provider.profiles
      if (method === 'dusk_requestProfiles') { provider.isAuthorized = true; return provider.profiles }
      if (method === 'dusk_disconnect') { provider.isAuthorized = false; return true }
      return null
    }),
  }
  const emit = (event: string, value?: unknown) => listeners.get(event)?.forEach(callback => callback(value))
  const base = new DuskWallet({ provider: provider as unknown as DuskProvider, rememberLastUsedProvider: false, autoRefresh: false })
  const wallet = createWalletSession(base)
  cleanups.push(wallet.destroy)
  await wallet.ready()
  await wallet.refresh()
  provider.request.mockClear()
  return { wallet, base, provider, emit }
}

it.each(['disconnect', 'authorization loss'])('hides delayed profiles after %s', async cause => {
  const { wallet, provider, emit } = await fixture()
  const profiles = Promise.withResolvers<unknown>()
  const request = provider.request.getMockImplementation()!
  provider.request.mockImplementation(args => args.method === 'dusk_profiles' ? profiles.promise : request(args))
  const refresh = wallet.refresh()
  await vi.waitFor(() => expect(provider.request).toHaveBeenCalledWith(expect.objectContaining({ method: 'dusk_profiles' })))
  if (cause === 'disconnect') await wallet.disconnect()
  else { provider.isAuthorized = false; emit('disconnect') }
  const seen: DuskWalletState[] = []
  wallet.subscribe(state => seen.push(state))
  profiles.resolve([{ account: 'A', profileId: 'primary' }])
  await refresh
  expect(wallet.state).toMatchObject({ authorized: false, selectedAddress: null, profiles: [], accounts: [] })
  expect(seen.every(state => state.selectedAddress === null)).toBe(true)
  expect(deriveWalletSessionModel(wallet.state, true).status).toBe('disconnected')
})

it('keeps explicit disconnect masked even when revocation fails and refresh restores authorized profiles', async () => {
  const { wallet, provider, emit } = await fixture()
  const request = provider.request.getMockImplementation()!
  provider.request.mockImplementation(args => args.method === 'dusk_disconnect' ? Promise.reject(new Error('offline')) : request(args))
  await expect(wallet.disconnect()).rejects.toThrow('offline')
  emit('connect', { chainId: 'dusk:0' })
  await wallet.refresh()
  expect(wallet.state).toMatchObject({ explicitlyDisconnected: true, authorized: false, selectedAddress: null, profiles: [], accounts: [] })
  await expect(wallet.getPublicBalance()).rejects.toThrow('Connect your wallet')
  await wallet.connect()
  expect(wallet.state).toMatchObject({ explicitlyDisconnected: false, authorized: true, selectedAddress: 'A' })
})

it('keeps explicit disconnect after rejected reconnection', async () => {
  const { wallet, provider } = await fixture()
  const request = provider.request.getMockImplementation()!
  provider.request.mockImplementation(args => {
    if (args.method === 'dusk_disconnect') return Promise.reject(new Error('offline'))
    if (args.method === 'dusk_requestProfiles') {
      return Promise.reject(Object.assign(new Error('User rejected the request'), { code: 4001 }))
    }
    return request(args)
  })

  await expect(wallet.disconnect()).rejects.toThrow('offline')
  await expect(wallet.connect()).rejects.toThrow('User rejected')
  expect(wallet.state).toMatchObject({ explicitlyDisconnected: true, authorized: false, selectedAddress: null })
})

it('keeps a new connection when an older profiles read finishes', async () => {
  const { wallet, provider } = await fixture()
  const delayed = Promise.withResolvers<unknown>()
  provider.request.mockImplementationOnce(async () => null).mockImplementationOnce(async () => 'dusk:0').mockImplementationOnce(() => delayed.promise)
  const refresh = wallet.refresh()
  await vi.waitFor(() => expect(provider.request).toHaveBeenCalledTimes(3))
  await wallet.disconnect()
  provider.profiles = [{ account: 'B', profileId: 'primary' }]
  const connected = wallet.connect()
  await vi.waitFor(() => expect(provider.request).toHaveBeenCalledWith(expect.objectContaining({ method: 'dusk_requestProfiles' })))
  delayed.resolve([{ account: 'A', profileId: 'primary' }])
  await expect(Promise.all([refresh, connected])).resolves.toBeDefined()
  expect(wallet.state.selectedAddress).toBe('B')
})

it('requires authorization and a selected profile even if old accounts remain', async () => {
  const { wallet } = await fixture()
  for (const changed of [{ authorized: false }, { selectedProfile: null }]) {
    expect(deriveWalletSessionModel({ ...wallet.state, ...changed }, true)).toMatchObject({ status: 'disconnected', selectedAddress: '', canSign: false })
  }
})

it.each(['balance', 'shielded address'])('drops a %s from a session that disconnected and reconnected', async kind => {
  const { wallet, provider } = await fixture()
  const response = Promise.withResolvers<never>()
  provider.request.mockImplementationOnce(() => response.promise)
  const pending = kind === 'balance' ? wallet.getPublicBalance() : wallet.requestShieldedAddress()
  const rejected = expect(pending).rejects.toThrow('session changed')
  await wallet.disconnect()
  await wallet.connect()
  response.resolve((kind === 'balance' ? { value: '100000000000', nonce: '0' } : 'shielded') as never)
  await rejected
})

it('prioritizes session invalidation when an in-flight wallet read rejects', async () => {
  const { wallet, provider, emit } = await fixture()
  const response = Promise.withResolvers<never>()
  provider.request.mockImplementationOnce(() => response.promise)
  const pending = wallet.getPublicBalance()
  await vi.waitFor(() => expect(provider.request).toHaveBeenCalledOnce())

  provider.profiles = [{ account: 'B', profileId: 'secondary' }]
  emit('profilesChanged', provider.profiles)
  response.reject(new Error('Dusk Wallet is locked'))

  await expect(pending).rejects.toThrow('wallet session changed')
})

it.each(['accountsChanged', 'profilesChanged', 'lock', 'chainChanged', 'duskNodeChanged', 'disconnect'])('re-syncs after %s during a slow refresh with at most one queued refresh', async event => {
  const { wallet, provider, emit } = await fixture()
  const delayed = Promise.withResolvers<unknown>()
  provider.request.mockImplementationOnce(async () => null).mockImplementationOnce(() => delayed.promise)
  const refresh = wallet.refresh()
  await vi.waitFor(() => expect(provider.request).toHaveBeenCalledTimes(3))
  provider.profiles = event === 'lock' ? [] : [{ account: 'B', profileId: 'another-profile' }]
  provider.chainId = 'dusk:1'
  if (event === 'disconnect') provider.isAuthorized = false
  for (let i = 0; i < 5; i++) emit(event, event === 'profilesChanged' ? provider.profiles : event === 'chainChanged' ? provider.chainId : {})
  expect(provider.request).toHaveBeenCalledTimes(3)
  delayed.resolve('dusk:0')
  await refresh
  expect(provider.request).toHaveBeenCalledTimes(6)
  expect(wallet.state).toMatchObject({ chainId: 'dusk:1', selectedAddress: event === 'lock' || event === 'disconnect' ? null : 'B' })
  if (event === 'lock') expect(deriveWalletSessionModel(wallet.state, true)).toMatchObject({ status: 'locked', selectedAddress: '' })
})

it.each(['profilesChanged', 'reconnect', 'disconnect'])('never publishes stale A while a corrective read after %s is delayed', async cause => {
  const { wallet, provider, emit } = await fixture()
  const delayed = Promise.withResolvers<unknown>()
  const corrective = Promise.withResolvers<unknown>()
  const request = provider.request.getMockImplementation()!
  let reads = 0
  provider.request.mockImplementation(args => args.method === 'dusk_profiles'
    ? (++reads === 1 ? delayed.promise : corrective.promise) : request(args))
  const refresh = wallet.refresh()
  await vi.waitFor(() => expect(reads).toBe(1))
  provider.profiles = [{ account: 'B', profileId: 'primary' }]
  emit('profilesChanged', provider.profiles)
  let connected: Promise<unknown> | undefined
  if (cause === 'reconnect') connected = expect(wallet.connect()).rejects.toThrow('Unlock your wallet')
  if (cause === 'disconnect') await wallet.disconnect()
  provider.profiles = []
  emit('profilesChanged', [])
  const seen: DuskWalletState[] = []
  wallet.subscribe(state => seen.push(state))
  delayed.resolve([{ account: 'A', profileId: 'primary' }])
  await vi.waitFor(() => expect(reads).toBe(2))
  expect(wallet.state.selectedAddress).toBeNull()
  expect(seen.every(state => state.selectedAddress === null)).toBe(true)
  corrective.resolve([])
  await Promise.all([refresh, connected])
  expect(wallet.state).toMatchObject({ profiles: [], accounts: [], selectedAddress: null })
  expect(seen.every(state => state.selectedAddress === null)).toBe(true)
})

it('restores profiles in the base wallet and observes a later lock, including a delayed pre-lock response', async () => {
  const { wallet, base, provider, emit } = await fixture([])
  const a = [{ account: 'A', profileId: 'primary' }]
  provider.request.mockImplementationOnce(async () => null).mockImplementationOnce(async () => 'dusk:0').mockResolvedValueOnce(a)
  await wallet.refresh()
  expect(base.state.selectedAddress).toBe('A')
  expect(wallet.state.selectedAddress).toBe('A')
  provider.request.mockClear()
  const delayed = Promise.withResolvers<unknown>()
  provider.request.mockImplementationOnce(async () => null).mockImplementationOnce(async () => 'dusk:0').mockImplementationOnce(() => delayed.promise)
  const refresh = wallet.refresh()
  await vi.waitFor(() => expect(provider.request).toHaveBeenCalledTimes(3))
  emit('profilesChanged', [])
  expect(walletConnectionStatus(wallet.state, true)).toBe('locked')
  delayed.resolve(a)
  await refresh
  expect(walletConnectionStatus(wallet.state, true)).toBe('locked')
  expect(base.state.selectedAddress).toBeNull()
  expect(provider.request).toHaveBeenCalledTimes(6)
})

it.each(['connected', 'locked', 'late authorization'])('re-syncs approval events that leave the wallet %s', async status => {
  const { wallet, provider, emit } = await fixture([])
  provider.isAuthorized = false
  emit('disconnect')
  await wallet.refresh()
  let authorizeOnRefresh = false
  provider.request.mockImplementation(async ({ method }) => {
    if (method === 'dusk_getCapabilities' && authorizeOnRefresh) {
      authorizeOnRefresh = false
      emit('connect', { chainId: 'dusk:0' })
    }
    if (method === 'dusk_requestProfiles') {
      provider.isAuthorized = true
      provider.profiles = [{ account: 'B', profileId: 'primary' }]
      if (status === 'late authorization') authorizeOnRefresh = true
      else emit('connect', { chainId: 'dusk:0' })
      emit('profilesChanged', provider.profiles)
      if (status === 'locked') { provider.profiles = []; emit('profilesChanged', []) }
      return [{ account: 'B', profileId: 'primary' }]
    }
    if (method === 'dusk_profiles') return provider.profiles
    if (method === 'dusk_chainId') return provider.chainId
    return null
  })
  const refresh = async () => { await wallet.refresh(); return walletConnectionStatus(wallet.state, true, 'dusk:0') }
  const pending = performWalletConnectionAction({ wallet, expectedChainId: 'dusk:0', refreshWalletConnectionState: refresh, refreshWalletSessionState: refresh })
  if (status === 'locked') await expect(pending).rejects.toThrow('Unlock your wallet')
  else await expect(pending).resolves.toEqual({ openModal: false })
  expect(wallet.state.selectedAddress).toBe(status === 'locked' ? null : 'B')
})

function claimStorage() {
  const data = new Map<string, string>()
  const storage = {
    get length() { return data.size },
    key: (index: number) => [...data.keys()][index] ?? null,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value) },
    removeItem: (key: string) => { data.delete(key) },
  }
  vi.stubGlobal('sessionStorage', storage)
  return storage
}

it.each(['accountsChanged', 'profilesChanged', 'lock', 'disconnect', 'explicit disconnect'])('clears remembered claim owners synchronously on %s', async event => {
  const storage = claimStorage()
  const { wallet, provider, emit } = await fixture()
  const key = 'dusk-domains:last-claim-owner:dusk:0'
  expect(storage.getItem(key)).toBe('A')
  storage.setItem('dusk-domains:last-claim-owner:dusk:2', 'A')
  storage.setItem('unrelated', 'keep')
  const delayed = Promise.withResolvers<unknown>()
  const request = provider.request.getMockImplementation()!
  provider.request.mockImplementation(args => args.method === 'dusk_profiles' ? delayed.promise : request(args))
  if (event === 'explicit disconnect') await wallet.disconnect()
  else emit(event, [])
  expect(storage.getItem(key)).toBeNull()
  expect(storage.getItem('dusk-domains:last-claim-owner:dusk:2')).toBeNull()
  expect(storage.getItem('unrelated')).toBe('keep')
  delayed.resolve([])
  await wallet.refresh()
  expect(storage.getItem(key)).toBeNull()
})

it('forgets A through a delayed refresh, switch to B and lock, and remembers only a stable reconnection', async () => {
  const storage = claimStorage()
  const { wallet, provider, emit } = await fixture()
  const key = 'dusk-domains:last-claim-owner:dusk:0'
  expect(storage.getItem(key)).toBe('A')
  const delayed = Promise.withResolvers<unknown>()
  const corrective = Promise.withResolvers<unknown>()
  const request = provider.request.getMockImplementation()!
  let reads = 0
  provider.request.mockImplementation(args => args.method === 'dusk_profiles'
    ? (++reads === 1 ? delayed.promise : corrective.promise) : request(args))
  const refresh = wallet.refresh()
  await vi.waitFor(() => expect(reads).toBe(1))
  provider.profiles = [{ account: 'B', profileId: 'primary' }]
  emit('profilesChanged', provider.profiles)
  provider.profiles = []
  emit('lock')
  expect(storage.getItem(key)).toBeNull()
  delayed.resolve([{ account: 'A', profileId: 'primary' }])
  await vi.waitFor(() => expect(reads).toBe(2))
  expect(storage.getItem(key)).toBeNull()
  corrective.resolve([])
  await refresh
  expect(wallet.state.selectedProfile).toBeNull()
  expect(storage.getItem(key)).toBeNull()
  provider.request.mockImplementation(request)
  provider.profiles = [{ account: 'B', profileId: 'primary' }]
  emit('profilesChanged', provider.profiles)
  expect(storage.getItem(key)).toBeNull()
  await wallet.refresh()
  expect(storage.getItem(key)).toBe('B')
})

it('does not unmask a retained profile when approval returns no profiles', async () => {
  const { wallet, provider } = await fixture()
  provider.request.mockImplementation(async ({ method }) => {
    if (method === 'dusk_disconnect') throw new Error('offline')
    if (method === 'dusk_requestProfiles') return []
    if (method === 'dusk_profiles') return [{ account: 'A', profileId: 'primary' }]
    if (method === 'dusk_chainId') return 'dusk:0'
    return null
  })
  await expect(wallet.disconnect()).rejects.toThrow('offline')
  await expect(wallet.connect()).rejects.toThrow('wallet session changed')
  expect(wallet.state).toMatchObject({ explicitlyDisconnected: true, selectedAddress: null })
})

it('keeps a later disconnect while approval is pending', async () => {
  const { wallet, provider } = await fixture()
  const approval = Promise.withResolvers<unknown>()
  provider.request.mockImplementation(async ({ method }) => {
    if (method === 'dusk_requestProfiles') return approval.promise
    if (method === 'dusk_disconnect') throw new Error('offline')
    if (method === 'dusk_profiles') return [{ account: 'A', profileId: 'primary' }]
    if (method === 'dusk_chainId') return 'dusk:0'
    return null
  })
  const pending = wallet.connect()
  await expect(wallet.disconnect()).rejects.toThrow('offline')
  approval.resolve([{ account: 'A', profileId: 'primary' }])
  await expect(pending).rejects.toThrow('wallet session changed')
  expect(wallet.state).toMatchObject({ explicitlyDisconnected: true, selectedAddress: null })
})

it('preserves an ordinary locked-wallet rejection when the session has not changed', async () => {
  const { wallet, provider } = await fixture([])
  const locked = new Error('Wallet is locked')
  provider.request.mockRejectedValueOnce(locked)
  await expect(wallet.getPublicBalance()).rejects.toBe(locked)
})
