import type { useAppRuntime } from './useAppRuntime'
import { useCallback } from 'react'
import { useDuskDomainWriter } from './useDuskDomainWriter'
import { useLiveWritePreflight } from './useLiveWritePreflight'
import { useDuskWalletSession } from '../features/wallet/useDuskWalletSession'
import { useSelectedAuthority } from '../features/wallet/useSelectedAuthority'
import { deriveWalletSessionModel } from '../features/wallet/walletStatus'

type AppRuntime = ReturnType<typeof useAppRuntime>

type UseWalletRuntimeArgs = Pick<
  AppRuntime,
  'connectKit' | 'connectOptions' | 'liveDuskDomainsApp' | 'runtimeConfig' | 'wallet'
> & {
  captureUrl: string | undefined
}

export function useWalletRuntime({
  captureUrl,
  connectKit,
  connectOptions,
  liveDuskDomainsApp,
  runtimeConfig,
  wallet,
}: UseWalletRuntimeArgs) {
  const expectedWalletChainId = runtimeConfig.liveWritesEnabled ? runtimeConfig.chainId : ''
  const expectedWalletNodeUrl = expectedWalletChainId === 'dusk:0' ? runtimeConfig.nodeUrl : ''
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
  } = useDuskWalletSession(connectKit, connectOptions, expectedWalletChainId, expectedWalletNodeUrl)

  const walletSession = deriveWalletSessionModel(walletState, walletDiscoveryReady, expectedWalletChainId, expectedWalletNodeUrl)
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

  const submitNameWrite = useDuskDomainWriter({
    captureUrl,
    chainId: runtimeConfig.chainId,
    contracts: runtimeConfig.contracts,
    liveDuskDomainsApp,
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
    expectedNodeUrl: expectedWalletNodeUrl,
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
