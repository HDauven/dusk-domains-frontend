import { useCallback, useRef } from 'react'
import { createPreviewRegistrationApp } from './appHelpers'
import { selectedWalletProviderName } from '../features/wallet/walletStatus'
import {
  recordBrowserWriteProof,
  submitDuskDomainWrite as submitDuskDomainWriteCall,
  type DuskConnectAppLike,
  type DuskDomainContractMap,
  type DuskDomainCallMetadata,
  type DuskDomainTxState,
  type DuskWalletState,
  type SubmitDuskDomainWriteOptions,
} from '../names/internal'

export type SubmitNameWrite = ReturnType<typeof useDuskDomainWriter>

type UseDuskDomainWriterArgs = {
  captureUrl: string | undefined
  chainId: string
  contracts: DuskDomainContractMap
  liveDuskDomainsApp: DuskConnectAppLike | null
  liveWritesEnabled: boolean
  selectedAddress: string
  walletState: DuskWalletState
}

export function useDuskDomainWriter({
  captureUrl,
  chainId,
  contracts,
  liveDuskDomainsApp,
  liveWritesEnabled,
  selectedAddress,
  walletState,
}: UseDuskDomainWriterArgs) {
  const pendingWrite = useRef(false)
  return useCallback(async (
    name: string,
    call: DuskDomainCallMetadata,
    options: SubmitDuskDomainWriteOptions = {},
  ): Promise<DuskDomainTxState> => {
    if (pendingWrite.current) throw new Error('Finish the pending wallet transaction before starting another.')
    const app = liveDuskDomainsApp ?? createPreviewRegistrationApp(name)
    pendingWrite.current = true

    return await submitDuskDomainWriteCall(app, call, {
      contracts,
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
    }).finally(() => { pendingWrite.current = false })
  }, [captureUrl, chainId, contracts, liveDuskDomainsApp, liveWritesEnabled, selectedAddress, walletState])
}
