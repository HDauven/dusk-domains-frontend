import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import {
  userFacingErrorMessage,
  type DuskWalletState,
} from '../../names/internal'
import type { DuskConnectKitLike, DuskWalletLike } from './walletSessionTypes'

export function useWalletBootstrap({
  connectKit,
  setWalletDiscoveryReady,
  setWalletError,
  setWalletState,
  wallet,
}: {
  connectKit: DuskConnectKitLike
  setWalletDiscoveryReady: Dispatch<SetStateAction<boolean>>
  setWalletError: Dispatch<SetStateAction<string>>
  setWalletState: Dispatch<SetStateAction<DuskWalletState>>
  wallet: DuskWalletLike
}) {
  const destroyTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null)

  useEffect(() => {
    let mounted = true
    if (destroyTimerRef.current) {
      globalThis.clearTimeout(destroyTimerRef.current)
      destroyTimerRef.current = null
    }

    const unsubscribe = connectKit.subscribe((nextState) => {
      globalThis.queueMicrotask(() => {
        if (mounted) setWalletState(nextState)
      })
    })
    void wallet.ready()
      .then(() => wallet.discoverProviders({ timeoutMs: 80 }))
      .then(() => wallet.refresh())
      .then(() => {
        if (mounted) {
          setWalletState(wallet.state)
          setWalletDiscoveryReady(true)
        }
      })
      .catch((error: unknown) => {
        if (mounted) {
          setWalletError(userFacingErrorMessage(error))
          setWalletState(wallet.state)
          setWalletDiscoveryReady(true)
        }
      })

    return () => {
      mounted = false
      unsubscribe()
      destroyTimerRef.current = globalThis.setTimeout(() => {
        connectKit.destroy()
        destroyTimerRef.current = null
      }, 0)
    }
  }, [connectKit, setWalletDiscoveryReady, setWalletError, setWalletState, wallet])
}
