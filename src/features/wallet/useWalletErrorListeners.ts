import { useEffect, type Dispatch, type SetStateAction } from 'react'
import {
  isRejectedWalletMessage,
  isWalletLockedMessage,
  userFacingErrorMessage,
  userFacingMessageFromText,
  type DuskWalletState,
} from '../../names/internal'
import type { DuskWalletLike } from './walletSessionTypes'

export function useWalletErrorListeners({
  refreshWalletSessionState,
  setWalletDiscoveryReady,
  setWalletError,
  setWalletState,
  wallet,
}: {
  refreshWalletSessionState: () => Promise<unknown>
  setWalletDiscoveryReady: Dispatch<SetStateAction<boolean>>
  setWalletError: Dispatch<SetStateAction<string>>
  setWalletState: Dispatch<SetStateAction<DuskWalletState>>
  wallet: DuskWalletLike
}) {
  useEffect(() => {
    const handleUnhandledWalletRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const rawMessage = reason instanceof Error ? reason.message : String(reason ?? '')

      if (!isWalletLockedMessage(rawMessage) && !isRejectedWalletMessage(rawMessage)) return

      event.preventDefault()
      event.stopImmediatePropagation()
      setWalletError(userFacingErrorMessage(reason))
      void refreshWalletSessionState().catch(() => {
        setWalletState(wallet.state)
        setWalletDiscoveryReady(true)
      })
    }

    globalThis.addEventListener('unhandledrejection', handleUnhandledWalletRejection, { capture: true })
    return () => {
      globalThis.removeEventListener('unhandledrejection', handleUnhandledWalletRejection, { capture: true })
    }
  }, [refreshWalletSessionState, setWalletDiscoveryReady, setWalletError, setWalletState, wallet])

  useEffect(() => {
    const handleWalletRequestError = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail : null
      const message = typeof detail?.message === 'string' ? detail.message : ''
      if (!isWalletLockedMessage(message) && !isRejectedWalletMessage(message)) return

      setWalletError(userFacingMessageFromText(message))
      void refreshWalletSessionState().catch(() => {
        setWalletState(wallet.state)
        setWalletDiscoveryReady(true)
      })
    }

    globalThis.addEventListener('dusk-domains:wallet-request-error', handleWalletRequestError)
    return () => {
      globalThis.removeEventListener('dusk-domains:wallet-request-error', handleWalletRequestError)
    }
  }, [refreshWalletSessionState, setWalletDiscoveryReady, setWalletError, setWalletState, wallet])
}
