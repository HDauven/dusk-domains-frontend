import { useCallback } from 'react'
import { createPreviewRegistrationApp } from './appHelpers'
import { selectedWalletProviderName } from '../features/wallet/walletStatus'
import {
  recordBrowserWriteProof,
  submitDuskNameWrite as submitDuskNameWriteCall,
  type DuskConnectAppLike,
  type DuskNameCallMetadata,
  type DuskNameTxState,
  type DuskWalletState,
  type SubmitDuskNameWriteOptions,
} from '../names/internal'

type UseDuskNameWriterArgs = {
  captureUrl: string | undefined
  chainId: string
  liveDuskNamesApp: DuskConnectAppLike | null
  liveWritesEnabled: boolean
  selectedAddress: string
  walletState: DuskWalletState
}

export function useDuskNameWriter({
  captureUrl,
  chainId,
  liveDuskNamesApp,
  liveWritesEnabled,
  selectedAddress,
  walletState,
}: UseDuskNameWriterArgs) {
  return useCallback(async (
    name: string,
    call: DuskNameCallMetadata,
    options: SubmitDuskNameWriteOptions = {},
  ): Promise<DuskNameTxState> => {
    const app = liveDuskNamesApp ?? createPreviewRegistrationApp(name)

    return await submitDuskNameWriteCall(app, call, {
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
      allowUnsafePreviewCall: !liveDuskNamesApp && options.allowUnsafePreviewCall,
    })
  }, [captureUrl, chainId, liveDuskNamesApp, liveWritesEnabled, selectedAddress, walletState])
}
