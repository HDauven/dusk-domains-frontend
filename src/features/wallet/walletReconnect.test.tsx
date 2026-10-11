// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { DuskWallet, type DuskProvider } from '@dusk/connect'
import { createWalletSession } from './walletSession'
import { useDuskWalletSession } from './useDuskWalletSession'
import { walletActionLabel, walletConnectionStatus } from './walletStatus'

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

// Dusk Wallet's page provider can report itself unauthorized for a moment, for example while
// the extension restarts; it re-syncs the next time the page asks it for something.
it('shows a connected wallet again after a brief loss of authorization, without a reload', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const listeners = new Map<string, Set<(value: unknown) => void>>()
  const provider = {
    isDusk: true, isAuthorized: true, chainId: 'dusk:0', profiles: [{ account: 'A', profileId: 'primary' }],
    on: (event: string, callback: (value: unknown) => void) => { if (!listeners.has(event)) listeners.set(event, new Set()); listeners.get(event)!.add(callback) },
    off: (event: string, callback: (value: unknown) => void) => { listeners.get(event)?.delete(callback) },
    request: vi.fn(async ({ method }: { method: string }): Promise<unknown> => {
      if (method === 'dusk_chainId') return provider.chainId
      if (method === 'dusk_profiles') return provider.isAuthorized ? provider.profiles : []
      return null
    }),
  }
  const wallet = createWalletSession(new DuskWallet({ provider: provider as unknown as DuskProvider, rememberLastUsedProvider: false, autoRefresh: false }))
  const connectKit = { wallet, open: vi.fn(), close: vi.fn(), subscribe: wallet.subscribe.bind(wallet), destroy: wallet.destroy.bind(wallet) }
  let label = ''
  function Header() {
    const { walletState, walletDiscoveryReady } = useDuskWalletSession(connectKit)
    label = walletActionLabel(walletConnectionStatus(walletState, walletDiscoveryReady))
    return null
  }
  const root = createRoot(document.createElement('div'))
  await act(async () => root.render(<Header />))
  await vi.waitFor(() => expect(label).toBe('Wallet'))

  provider.isAuthorized = false
  await act(async () => { listeners.get('disconnect')?.forEach(callback => callback({ code: 4900 })) })
  await vi.waitFor(() => expect(label).toBe('Connect wallet'))

  // The extension is back; nothing on the page changes until the app asks again.
  provider.isAuthorized = true
  await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
  await vi.waitFor(() => expect(label).toBe('Wallet'))
  await act(async () => root.unmount())
  vi.runOnlyPendingTimers()
})

it('also checks again when the page regains focus, but never after an explicit disconnect', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const provider = {
    isDusk: true, isAuthorized: false, chainId: 'dusk:0', profiles: [{ account: 'A', profileId: 'primary' }],
    on: () => {}, off: () => {},
    request: vi.fn(async ({ method }: { method: string }): Promise<unknown> => {
      if (method === 'dusk_chainId') return provider.chainId
      if (method === 'dusk_profiles') return provider.isAuthorized ? provider.profiles : []
      if (method === 'dusk_disconnect') { provider.isAuthorized = false; return true }
      return null
    }),
  }
  const wallet = createWalletSession(new DuskWallet({ provider: provider as unknown as DuskProvider, rememberLastUsedProvider: false, autoRefresh: false }))
  const connectKit = { wallet, open: vi.fn(), close: vi.fn(), subscribe: wallet.subscribe.bind(wallet), destroy: wallet.destroy.bind(wallet) }
  let label = ''
  function Header() {
    const { walletState, walletDiscoveryReady } = useDuskWalletSession(connectKit)
    label = walletActionLabel(walletConnectionStatus(walletState, walletDiscoveryReady))
    return null
  }
  const root = createRoot(document.createElement('div'))
  await act(async () => root.render(<Header />))
  await vi.waitFor(() => expect(label).toBe('Connect wallet'))
  // Connected in another tab: focusing this one shows it.
  provider.isAuthorized = true
  await act(async () => { window.dispatchEvent(new Event('focus')) })
  await vi.waitFor(() => expect(label).toBe('Wallet'))
  await act(async () => { await wallet.disconnect() })
  await vi.waitFor(() => expect(label).toBe('Connect wallet'))
  provider.isAuthorized = true
  await act(async () => { window.dispatchEvent(new Event('focus')); await vi.advanceTimersByTimeAsync(20_000) })
  await new Promise(resolve => setTimeout(resolve, 50))
  expect(label).toBe('Connect wallet')
  await act(async () => root.unmount())
  vi.runOnlyPendingTimers()
})
