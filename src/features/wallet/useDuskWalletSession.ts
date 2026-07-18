import { useCallback, useState } from 'react'
import {
  type DuskConnectOptions,
  userFacingErrorMessage,
  type DuskWalletState,
} from '../../names/internal'
import { useWalletAutoRefresh } from './useWalletAutoRefresh'
import { useWalletBootstrap } from './useWalletBootstrap'
import { useWalletErrorListeners } from './useWalletErrorListeners'
import { performWalletConnectionAction } from './walletConnectionAction'
import { walletConnectionStatus } from './walletStatus'
import type { DuskConnectKitLike } from './walletSessionTypes'

export function useDuskWalletSession(
  connectKit: DuskConnectKitLike,
  connectOptions?: DuskConnectOptions,
  expectedChainId = '',
  expectedNodeUrl = '',
) {
  const wallet = connectKit.wallet
  const [walletState, setWalletState] = useState<DuskWalletState>(() => wallet.state)
  const [walletError, setWalletError] = useState('')
  const [walletDiscoveryReady, setWalletDiscoveryReady] = useState(false)
  const [walletDiscoveryRefreshing, setWalletDiscoveryRefreshing] = useState(false)

  const refreshWalletSessionState = useCallback(async () => {
    try {
      await wallet.refresh()
    } finally {
      setWalletState(wallet.state)
      setWalletDiscoveryReady(true)
    }

    return walletConnectionStatus(wallet.state, true, expectedChainId, expectedNodeUrl)
  }, [expectedChainId, expectedNodeUrl, wallet])

  const refreshWalletConnectionState = useCallback(async (timeoutMs = 400) => {
    try {
      await wallet.discoverProviders({ timeoutMs })
    } finally {
      await refreshWalletSessionState()
    }

    return walletConnectionStatus(wallet.state, true, expectedChainId, expectedNodeUrl)
  }, [expectedChainId, expectedNodeUrl, refreshWalletSessionState, wallet])

  useWalletBootstrap({
    connectKit,
    setWalletDiscoveryReady,
    setWalletError,
    setWalletState,
    wallet,
  })

  useWalletErrorListeners({
    refreshWalletSessionState,
    setWalletDiscoveryReady,
    setWalletError,
    setWalletState,
    wallet,
  })

  useWalletAutoRefresh({
    expectedChainId,
    expectedNodeUrl,
    refreshWalletSessionState,
    walletDiscoveryReady,
    walletState,
  })

  const handleOpenWalletConnection = useCallback(async () => {
    setWalletError('')
    let openModal = true
    try {
      const result = await performWalletConnectionAction({
        connectOptions,
        expectedChainId,
        expectedNodeUrl,
        refreshWalletConnectionState,
        refreshWalletSessionState,
        wallet,
      })
      openModal = result.openModal
    } catch (error) {
      openModal = false
      setWalletError(userFacingErrorMessage(error))
    } finally {
      if (openModal) connectKit.open()
    }
  }, [connectKit, connectOptions, expectedChainId, expectedNodeUrl, refreshWalletConnectionState, refreshWalletSessionState, wallet])

  const handleRefreshWalletProviders = useCallback(async () => {
    setWalletDiscoveryRefreshing(true)
    setWalletError('')
    try {
      await refreshWalletConnectionState(1500)
    } catch (error) {
      setWalletError(userFacingErrorMessage(error))
      setWalletState(wallet.state)
      setWalletDiscoveryReady(true)
    } finally {
      setWalletDiscoveryRefreshing(false)
    }
  }, [refreshWalletConnectionState, wallet])

  return {
    handleOpenWalletConnection,
    handleRefreshWalletProviders,
    refreshWalletConnectionState,
    refreshWalletSessionState,
    setWalletError,
    walletDiscoveryReady,
    walletDiscoveryRefreshing,
    walletError,
    walletState,
  }
}
