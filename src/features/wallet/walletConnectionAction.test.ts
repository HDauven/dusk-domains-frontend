import { afterEach, describe, expect, it, vi } from 'vitest'

import { performWalletConnectionAction } from './walletConnectionAction'

afterEach(() => {
  vi.useRealTimers()
})

describe('wallet connection action', () => {
  it('requests the expected chain when the connected wallet is on the wrong network', async () => {
    const switchChain = vi.fn().mockResolvedValue(null)
    const refreshWalletSessionState = vi.fn().mockResolvedValue('connected')

    const result = await performWalletConnectionAction({
      expectedChainId: 'dusk:2',
      refreshWalletConnectionState: vi.fn().mockResolvedValue('wrong-network'),
      refreshWalletSessionState,
      wallet: walletLike({ switchChain }),
    })

    expect(result).toEqual({ openModal: false })
    expect(switchChain).toHaveBeenCalledWith({ chainId: 'dusk:2' })
    expect(refreshWalletSessionState).toHaveBeenCalledOnce()
  })

  it('waits for wallet state to converge after an approved network switch', async () => {
    vi.useFakeTimers()
    const switchChain = vi.fn().mockResolvedValue(null)
    const refreshWalletSessionState = vi.fn()
      .mockResolvedValueOnce('wrong-network')
      .mockResolvedValueOnce('wrong-network')
      .mockResolvedValueOnce('connected')

    const resultPromise = performWalletConnectionAction({
      expectedChainId: 'dusk:2',
      refreshWalletConnectionState: vi.fn().mockResolvedValue('wrong-network'),
      refreshWalletSessionState,
      wallet: walletLike({ switchChain }),
    })

    await vi.runAllTimersAsync()
    await expect(resultPromise).resolves.toEqual({ openModal: false })
    expect(switchChain).toHaveBeenCalledWith({ chainId: 'dusk:2' })
    expect(refreshWalletSessionState).toHaveBeenCalledTimes(3)
  })

  it('uses the configured custom node instead of the default localnet preset', async () => {
    const switchChain = vi.fn().mockResolvedValue(null)

    await performWalletConnectionAction({
      expectedChainId: 'dusk:0',
      expectedNodeUrl: 'http://127.0.0.1:18181/',
      refreshWalletConnectionState: vi.fn().mockResolvedValue('wrong-network'),
      refreshWalletSessionState: vi.fn().mockResolvedValue('connected'),
      wallet: walletLike({ switchChain }),
    })

    expect(switchChain).toHaveBeenCalledWith({ nodeUrl: 'http://127.0.0.1:18181/' })
    expect(switchChain).not.toHaveBeenCalledWith({ chainId: 'dusk:0' })
  })

  it('falls back to the modal when a wrong-network wallet cannot switch directly', async () => {
    const result = await performWalletConnectionAction({
      expectedChainId: 'dusk:2',
      refreshWalletConnectionState: vi.fn().mockResolvedValue('wrong-network'),
      refreshWalletSessionState: vi.fn(),
      wallet: walletLike(),
    })

    expect(result).toEqual({ openModal: true })
  })

  it('continues to unlock an authorized locked wallet directly', async () => {
    const connectOptions = { reason: 'Manage public .dusk domains.' }
    const connect = vi.fn().mockResolvedValue([{ profileId: 'primary', account: 'dusk1account' }])
    const refreshWalletSessionState = vi.fn().mockResolvedValue('connected')

    const result = await performWalletConnectionAction({
      connectOptions,
      expectedChainId: 'dusk:2',
      refreshWalletConnectionState: vi.fn().mockResolvedValue('locked'),
      refreshWalletSessionState,
      wallet: walletLike({ connect }),
    })

    expect(result).toEqual({ openModal: false })
    expect(connect).toHaveBeenCalledWith(connectOptions)
    expect(refreshWalletSessionState).toHaveBeenCalledOnce()
  })
})

function walletLike(overrides = {}) {
  return {
    state: {
      accounts: [],
      authorized: false,
      availableProviders: [],
      capabilities: null,
      chainId: null,
      installed: true,
      lastUpdated: 0,
      node: null,
      profiles: [],
      providerId: null,
      providerInfo: null,
      selectedAddress: null,
      selectedProfile: null,
    },
    discoverProviders: vi.fn(),
    ready: vi.fn(),
    refresh: vi.fn(),
    ...overrides,
  }
}
