import { useCallback } from 'react'
import { createPreviewRegistrationApp } from './appHelpers'
import { selectedWalletProviderName } from '../features/wallet/walletStatus'
import {
  recordBrowserWriteProof,
  submitDuskDomainWrite as submitDuskDomainWriteCall,
  type DuskConnectAppLike,
  type DuskDomainCallMetadata,
  type DuskDomainTxState,
  type DuskWalletState,
  type SubmitDuskDomainWriteOptions,
} from '../names/internal'

type UseDuskDomainWriterArgs = {
  captureUrl: string | undefined
  chainId: string
  liveDuskDomainsApp: DuskConnectAppLike | null
  liveWritesEnabled: boolean
  selectedAddress: string
  walletState: DuskWalletState
}

export function useDuskDomainWriter({
  captureUrl,
  chainId,
  liveDuskDomainsApp,
  liveWritesEnabled,
  selectedAddress,
  walletState,
}: UseDuskDomainWriterArgs) {
  return useCallback(async (
    name: string,
    call: DuskDomainCallMetadata,
    options: SubmitDuskDomainWriteOptions = {},
  ): Promise<DuskDomainTxState> => {
    const app = liveDuskDomainsApp ?? createPreviewRegistrationApp(name)

    return await submitDuskDomainWriteCall(app, call, {
      ...options,
      onUpdate: (state) => {
        options.onUpdate?.(state)
        if (!liveWritesEnabled) return
        try {
          recordBrowserWriteProof({
            chainId,
            name,
            account: selectedAddress,
            provider: selectedWalletProviderName(walletState),
            state,
            captureUrl,
          })
        } catch {
          // Proof capture must never block the user flow.
        }
      },
      allowUnsafePreviewCall: !liveDuskDomainsApp && options.allowUnsafePreviewCall,
    })
  }, [captureUrl, chainId, liveDuskDomainsApp, liveWritesEnabled, selectedAddress, walletState])
}
