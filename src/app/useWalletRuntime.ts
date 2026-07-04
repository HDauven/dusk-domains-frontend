import type { useAppRuntime } from './useAppRuntime'
import { useCallback } from 'react'
import { useDuskNameWriter } from './useDuskNameWriter'
import { useLiveWritePreflight } from './useLiveWritePreflight'
import { useDuskWalletSession } from '../features/wallet/useDuskWalletSession'
import { useSelectedAuthority } from '../features/wallet/useSelectedAuthority'
import { deriveWalletSessionModel } from '../features/wallet/walletStatus'

type AppRuntime = ReturnType<typeof useAppRuntime>

type UseWalletRuntimeArgs = Pick<
  AppRuntime,
  'connectKit' | 'connectOptions' | 'liveDuskNamesApp' | 'runtimeConfig' | 'wallet'
> & {
  captureUrl: string | undefined
}

export function useWalletRuntime({
  captureUrl,
  connectKit,
  connectOptions,
  liveDuskNamesApp,
  runtimeConfig,
  wallet,
}: UseWalletRuntimeArgs) {
  const {
    handleOpenWalletConnection,
    handleRefreshWalletProviders,
    refreshWalletConnectionState,
    refreshWalletSessionState,
    setWalletError,
    walletDiscoveryReady,
    walletDiscoveryRefreshing,
    walletError,
    walletState,
  } = useDuskWalletSession(connectKit, connectOptions, runtimeConfig.chainId)

  const walletSession = deriveWalletSessionModel(walletState, walletDiscoveryReady, runtimeConfig.chainId)
  const walletSetupState = walletSession.status
  const selectedAuthorityState = useSelectedAuthority({
    walletSession,
  })
  const {
    referralLookupKey,
    selectedAddress,
    selectedAuthority,
    selectedContractPrincipal,
    selectedContractPrincipalResult,
    selectedTypedPrincipal,
    selectedTypedPrincipalKey,
    selectedTypedPrincipalResult,
  } = selectedAuthorityState

  const submitNameWrite = useDuskNameWriter({
    captureUrl,
    chainId: runtimeConfig.chainId,
    liveDuskNamesApp,
    liveWritesEnabled: runtimeConfig.liveWritesEnabled,
    selectedAddress,
    walletState,
  })
  const requestSelectedShieldedAddress = useCallback(async () => {
    if (!selectedAddress) throw new Error('Connect a wallet first.')
    if (!wallet.requestShieldedAddress) throw new Error('This wallet does not expose a shielded receive address.')

    const shieldedAddress = await wallet.requestShieldedAddress({
      account: selectedAddress,
      reason: 'payment_request',
      label: 'Dusk Domains',
    })
    await refreshWalletSessionState().catch(() => undefined)
    return shieldedAddress
  }, [refreshWalletSessionState, selectedAddress, wallet])

  const {
    ensureContractAuthorityForLiveWrite,
    ensurePublicBalanceForLiveWrite,
  } = useLiveWritePreflight({
    connectKit,
    connectOptions,
    liveWritesEnabled: runtimeConfig.liveWritesEnabled,
    refreshWalletConnectionState,
    refreshWalletSessionState,
    selectedContractPrincipal,
    selectedContractPrincipalResult,
    wallet,
  })

  return {
    ensureContractAuthorityForLiveWrite,
    ensurePublicBalanceForLiveWrite,
    handleOpenWalletConnection,
    handleRefreshWalletProviders,
    referralLookupKey,
    selectedAddress,
    selectedAuthority,
    selectedContractPrincipal,
    selectedContractPrincipalResult,
    selectedTypedPrincipal,
    selectedTypedPrincipalKey,
    selectedTypedPrincipalResult,
    setWalletError,
    requestSelectedShieldedAddress,
    submitNameWrite,
    walletDiscoveryRefreshing,
    walletError,
    walletSession,
    walletSetupState,
    walletState,
  }
}
