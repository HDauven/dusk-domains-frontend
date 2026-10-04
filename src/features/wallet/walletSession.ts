import { DuskWallet, type ConnectOptions, type DuskProvider, type DuskWalletState, type RequestShieldedAddressParams, type SwitchChainParams } from '@dusk/connect'
import { WalletSessionChangedError } from './sessionWriteWallet'
import { clearClaimOwner, rememberClaimOwner } from './claimOwner'

export type WalletSessionState = DuskWalletState & { explicitlyDisconnected: boolean; generation: number }

// Only current refreshes publish connected profiles. Provider events invalidate
// the snapshot immediately, independently of responses still in flight.
export function createWalletSession(wallet = new DuskWallet({ autoRefresh: false })) {
  clearClaimOwner()
  let explicitlyDisconnected = false
  let destroyed = false
  let generation = 0
  let connectionAttempt = 0
  let current = wallet.state
  let activeRefresh: Promise<WalletSessionState> | null = null
  let queuedRefresh = false
  let provider: DuskProvider | null = null
  const listeners = new Set<(state: WalletSessionState) => void>()
  const events = ['connect', 'disconnect', 'accountsChanged', 'profilesChanged', 'chainChanged', 'duskNodeChanged', 'lock'] as const

  const state = (): WalletSessionState => {
    return explicitlyDisconnected || !current.authorized
      ? { ...current, explicitlyDisconnected, generation, authorized: false, profiles: [], accounts: [], selectedProfile: null, selectedAddress: null }
      : { ...current, explicitlyDisconnected, generation }
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
    const startedProvider = wallet.provider
    const account = current.selectedProfile?.account
    const profileId = current.selectedProfile?.profileId
    const chainId = current.chainId
    if (explicitlyDisconnected) throw new Error('Connect your wallet and try again.')
    const checkSession = () => {
      if (started !== generation || startedProvider !== wallet.provider || explicitlyDisconnected || destroyed
        || current.selectedProfile?.account !== account || current.selectedProfile?.profileId !== profileId || current.chainId !== chainId) {
        throw new WalletSessionChangedError()
      }
    }
    try {
      const result = await read()
      checkSession()
      return result
    } catch (error) {
      checkSession()
      throw error
    }
  }

  return {
    get state() { return state() },
    ready: () => wallet.ready(),
    discoverProviders: (options?: { timeoutMs?: number }) => wallet.discoverProviders(options),
    refresh: () => refresh(),
    async connect(options?: ConnectOptions) {
      const attempt = ++connectionAttempt
      const wasDisconnected = explicitlyDisconnected
      const connectingProvider = wallet.provider
      generation++
      clearClaimOwner()
      current = { ...current, profiles: [], accounts: [], selectedProfile: null, selectedAddress: null }
      publish()
      try {
        const approved = await wallet.connect(options)
        await refresh(true)
        if (attempt !== connectionAttempt || wallet.provider !== connectingProvider || destroyed) throw new WalletSessionChangedError()
        if (!current.authorized || !current.selectedProfile) throw new Error('Unlock your wallet and try again.')
        if (!approved.some(profile => profile.account === current.selectedProfile?.account && profile.profileId === current.selectedProfile?.profileId)) {
          throw new WalletSessionChangedError()
        }
        explicitlyDisconnected = false
        rememberClaimOwner(current)
        publish()
      } catch (error) {
        if (attempt === connectionAttempt) explicitlyDisconnected = wasDisconnected
        clearClaimOwner()
        publish()
        throw error
      }
      return state().profiles
    },
    async disconnect() {
      connectionAttempt++
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
      connectionAttempt++
      destroyed = true
      generation++
      unsubscribe()
      events.forEach(event => provider?.off?.(event, onProviderEvent))
      listeners.clear()
      wallet.destroy()
    },
  }
}
