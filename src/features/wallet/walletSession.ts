import { DuskWallet, type ConnectOptions, type DuskProvider, type DuskWalletState, type RequestShieldedAddressParams, type SwitchChainParams } from '@dusk/connect'
import { clearClaimOwner, rememberClaimOwner } from './claimOwner'

export type WalletSessionState = DuskWalletState & { explicitlyDisconnected: boolean }

// Only current refreshes publish connected profiles. Provider events invalidate
// the snapshot immediately, independently of responses still in flight.
export function createWalletSession(wallet = new DuskWallet({ autoRefresh: false })) {
  clearClaimOwner()
  let explicitlyDisconnected = false
  let destroyed = false
  let generation = 0
  let current = wallet.state
  let activeRefresh: Promise<WalletSessionState> | null = null
  let queuedRefresh = false
  let provider: DuskProvider | null = null
  const listeners = new Set<(state: WalletSessionState) => void>()
  const events = ['connect', 'disconnect', 'accountsChanged', 'profilesChanged', 'chainChanged', 'duskNodeChanged', 'lock'] as const

  const state = (): WalletSessionState => {
    return explicitlyDisconnected || !current.authorized
      ? { ...current, explicitlyDisconnected, authorized: false, profiles: [], accounts: [], selectedProfile: null, selectedAddress: null }
      : { ...current, explicitlyDisconnected }
  }
  const publish = () => listeners.forEach(listener => listener(state()))
  const refresh = (fresh = false): Promise<WalletSessionState> => {
    if (activeRefresh) {
      queuedRefresh ||= fresh
      return activeRefresh
    }
    activeRefresh = Promise.resolve().then(async () => {
      do {
        queuedRefresh = false
        const started = generation
        const refreshed = await wallet.refresh()
        if (started === generation && !destroyed) {
          current = refreshed
          clearClaimOwner()
          if (!explicitlyDisconnected) rememberClaimOwner(current)
          publish()
        }
      } while (queuedRefresh && !destroyed)
      return state()
    }).finally(() => { activeRefresh = null })
    return activeRefresh
  }
  const onProviderEvent = () => {
    generation++
    clearClaimOwner()
    // Events can revoke a session immediately; only a completed read can restore it.
    current = { ...wallet.state, profiles: [], accounts: [], selectedProfile: null, selectedAddress: null }
    publish()
    void refresh(true).catch(() => {})
  }
  const unsubscribe = wallet.subscribe(() => {
    if (wallet.provider !== provider) {
      events.forEach(event => provider?.off?.(event, onProviderEvent))
      provider = wallet.provider
      events.forEach(event => provider?.on?.(event, onProviderEvent))
      onProviderEvent()
    }
    const { installed, availableProviders, providerId, providerInfo } = wallet.state
    current = { ...current, installed, availableProviders, providerId, providerInfo }
    publish()
  })
  const readForSession = async <T>(read: () => Promise<T>) => {
    const started = generation
    if (explicitlyDisconnected) throw new Error('Connect your wallet and try again.')
    const result = await read()
    if (started !== generation || explicitlyDisconnected) throw new Error('The wallet session changed. Connect your wallet and try again.')
    return result
  }

  return {
    get state() { return state() },
    ready: () => wallet.ready(),
    discoverProviders: (options?: { timeoutMs?: number }) => wallet.discoverProviders(options),
    refresh: () => refresh(),
    async connect(options?: ConnectOptions) {
      explicitlyDisconnected = false
      generation++
      clearClaimOwner()
      current = { ...current, profiles: [], accounts: [], selectedProfile: null, selectedAddress: null }
      publish()
      try { await wallet.connect(options) } finally { await refresh(true) }
      if (!state().authorized || !state().selectedProfile) throw new Error('Unlock your wallet and try again.')
      return state().profiles
    },
    async disconnect() {
      explicitlyDisconnected = true
      generation++
      clearClaimOwner()
      publish()
      return wallet.disconnect()
    },
    getPublicBalance: () => readForSession(() => wallet.getPublicBalance()),
    requestShieldedAddress: (params?: RequestShieldedAddressParams) => readForSession(() => wallet.requestShieldedAddress(params)),
    switchChain: (params: SwitchChainParams) => wallet.switchChain(params),
    subscribe(listener: (state: WalletSessionState) => void) {
      listeners.add(listener)
      listener(state())
      return () => { listeners.delete(listener) }
    },
    destroy() {
      destroyed = true
      generation++
      unsubscribe()
      events.forEach(event => provider?.off?.(event, onProviderEvent))
      listeners.clear()
      wallet.destroy()
    },
  }
}
