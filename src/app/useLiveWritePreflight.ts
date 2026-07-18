import { useCallback } from 'react'
import {
  type DuskConnectOptions,
  type ContractPrincipalResult,
} from '../names/internal'
import {
  ensurePublicBalanceForLiveWriteRequest,
  type BalanceWallet,
  type WalletModalControl,
} from './liveWritePreflight'

type UseLiveWritePreflightArgs = {
  connectKit: WalletModalControl
  connectOptions?: DuskConnectOptions
  expectedNodeUrl?: string
  liveWritesEnabled: boolean
  refreshWalletConnectionState: () => Promise<unknown>
  refreshWalletSessionState: () => Promise<unknown>
  selectedContractPrincipal: string
  selectedContractPrincipalResult: ContractPrincipalResult | null
  wallet: BalanceWallet
}

export function useLiveWritePreflight({
  connectKit,
  connectOptions,
  expectedNodeUrl,
  liveWritesEnabled,
  refreshWalletConnectionState,
  refreshWalletSessionState,
  selectedContractPrincipal,
  selectedContractPrincipalResult,
  wallet,
}: UseLiveWritePreflightArgs) {
  const ensurePublicBalanceForLiveWrite = useCallback(async (
    action: string,
    setError: (message: string) => void,
    transactionCount = 1,
    extraRequiredLux = 0n,
  ) => {
    return ensurePublicBalanceForLiveWriteRequest({
      action,
      connectKit,
      connectOptions,
      expectedNodeUrl,
      extraRequiredLux,
      liveWritesEnabled,
      refreshWalletConnectionState,
      refreshWalletSessionState,
      setError,
      transactionCount,
      wallet,
    })
  }, [connectKit, connectOptions, expectedNodeUrl, liveWritesEnabled, refreshWalletConnectionState, refreshWalletSessionState, wallet])

  const ensureContractAuthorityForLiveWrite = useCallback((
    action: string,
    setError: (message: string) => void,
  ) => {
    if (!liveWritesEnabled || selectedContractPrincipal) return true

    const reason = selectedContractPrincipalResult && !selectedContractPrincipalResult.ok
      ? ` ${selectedContractPrincipalResult.reason}`
      : ''
    setError(`Cannot ${action} with this wallet account.${reason}`)
    return false
  }, [liveWritesEnabled, selectedContractPrincipal, selectedContractPrincipalResult])

  return {
    ensureContractAuthorityForLiveWrite,
    ensurePublicBalanceForLiveWrite,
  }
}
