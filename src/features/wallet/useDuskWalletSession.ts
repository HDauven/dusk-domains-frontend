import { useCallback, useRef, useState } from 'react'
import {
  type DuskConnectOptions,
  userFacingErrorMessage,
} from '../../names/internal'
import { useWalletAutoRefresh } from './useWalletAutoRefresh'
import { useWalletBootstrap } from './useWalletBootstrap'
import { useWalletErrorListeners } from './useWalletErrorListeners'
import { performWalletConnectionAction } from './walletConnectionAction'
import { walletConnectionStatus } from './walletStatus'
import type { DuskConnectKitLike, DuskWalletLike } from './walletSessionTypes'

export function useDuskWalletSession(
  connectKit: DuskConnectKitLike,
  connectOptions?: DuskConnectOptions,
  expectedChainId = '',
  expectedNodeUrl = '',
) {
  const wallet = connectKit.wallet
  const [walletState, setWalletState] = useState<DuskWalletLike['state']>(() => wallet.state)
  const busy = useRef(false)
  const [walletBusy, setWalletBusy] = useState(false)
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
    if (busy.current) return
    busy.current = true
    setWalletBusy(true)
    setWalletError('')
    connectKit.open()
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
      openModal = true
      setWalletError(userFacingErrorMessage(error))
    } finally {
      busy.current = false
      setWalletBusy(false)
      if (!openModal) connectKit.close?.()
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
    walletBusy,
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
