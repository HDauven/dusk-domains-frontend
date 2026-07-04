import { useEffect } from 'react'
import type { DuskWalletState } from '../../names/internal'

export function useWalletAutoRefresh({
  expectedChainId,
  refreshWalletSessionState,
  walletDiscoveryReady,
  walletState,
}: {
  expectedChainId?: string
  refreshWalletSessionState: () => Promise<unknown>
  walletDiscoveryReady: boolean
  walletState: DuskWalletState
}) {
  const providerDetected = Boolean(walletState.installed || walletState.providerInfo || walletState.availableProviders.length > 0)
  const selectedAccount = walletState.selectedAddress ?? walletState.accounts[0] ?? ''
  const walletChainId = normalizeChainId(walletState.chainId ?? '')
  const targetChainId = normalizeChainId(expectedChainId ?? '')
  const wrongNetwork = Boolean(selectedAccount && walletChainId && targetChainId && walletChainId !== targetChainId)

  useEffect(() => {
    if (!walletDiscoveryReady || !providerDetected || !walletState.authorized) return
    const intervalMs = wrongNetwork ? 1_000 : 10_000

    let cancelled = false
    const refresh = async () => {
      if (cancelled) return
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      try {
        await refreshWalletSessionState()
      } catch {
        // The next explicit wallet action will surface the provider error.
      }
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    const handleFocus = () => {
      void refresh()
    }

    const intervalId = globalThis.setInterval(() => {
      void refresh()
    }, intervalMs)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    globalThis.addEventListener('focus', handleFocus)

    return () => {
      cancelled = true
      globalThis.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      globalThis.removeEventListener('focus', handleFocus)
    }
  }, [
    expectedChainId,
    providerDetected,
    refreshWalletSessionState,
    wrongNetwork,
    walletDiscoveryReady,
    walletState.authorized,
    walletState.availableProviders.length,
    walletState.chainId,
    walletState.installed,
    walletState.accounts,
    walletState.providerId,
    walletState.providerInfo,
    walletState.providerInfo?.uuid,
    walletState.selectedAddress,
  ])
}

function normalizeChainId(chainId: string) {
  return chainId.trim().toLowerCase()
}
