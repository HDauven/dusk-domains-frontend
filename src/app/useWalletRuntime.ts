import { captureWalletSession } from '../features/wallet/captureWalletSession'
import { WalletSessionChangedError } from '../features/wallet/sessionWriteWallet'
import type { useAppRuntime } from './useAppRuntime'
import type { PendingConfirmation } from './confirmationRead'
import { useCallback, useState } from 'react'
import { useDuskDomainWriter } from './useDuskDomainWriter'
import { useLiveWritePreflight } from './useLiveWritePreflight'
import { useDuskWalletSession } from '../features/wallet/useDuskWalletSession'
import { useSelectedAuthority } from '../features/wallet/useSelectedAuthority'
import { deriveWalletSessionModel } from '../features/wallet/walletStatus'

type AppRuntime = ReturnType<typeof useAppRuntime>

type UseWalletRuntimeArgs = Pick<
  AppRuntime,
  'indexerClient' | 'writeAccess' | 'connectKit' | 'connectOptions' | 'liveDuskDomainsApp' | 'runtimeConfig' | 'wallet'
>
  & Pick<Parameters<typeof useDuskDomainWriter>[0], 'confirmOwnershipWrite' | 'getWorkspaceToken'>

export function useWalletRuntime({
  getWorkspaceToken,
  indexerClient,
  confirmOwnershipWrite,
  writeAccess,
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
    walletBusy,
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

  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null)
  const submitNameWrite = useDuskDomainWriter({
    wallet,
    chainId: runtimeConfig.chainId,
    getWorkspaceToken,
    onPendingConfirmation: setPendingConfirmation,
    nodeUrl: runtimeConfig.nodeUrl,
    indexerClient,
    confirmOwnershipWrite,
    writeAccess,
    contracts: runtimeConfig.contracts,
    liveDuskDomainsApp,
  })
  const requestSelectedShieldedAddress = useCallback(async () => {
    if (!selectedAddress) throw new Error('Connect a wallet first.')
    if (!wallet.requestShieldedAddress) throw new Error('This wallet does not expose a shielded receive address.')

    const session = captureWalletSession(wallet)
    if (!session() || wallet.state.selectedProfile?.account !== selectedAddress) throw new WalletSessionChangedError()
    const shieldedAddress = await wallet.requestShieldedAddress({
      account: selectedAddress,
      reason: 'payment_request',
      label: 'Dusk Domains',
    })
    try {
      await refreshWalletSessionState()
    } catch (error) {
      if (!session()) throw new WalletSessionChangedError()
      throw error
    }
    if (!session()) throw new WalletSessionChangedError()
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
    pendingConfirmation,
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
    walletBusy,
    walletSession,
    walletSetupState,
    walletState,
  }
}
