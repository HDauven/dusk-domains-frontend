import { useCallback, useLayoutEffect, useRef } from 'react'
import type { DuskDomainsRuntimeEnv } from '../names/internal'
import { useDomainManagementAppState } from './useDomainManagementAppState'
import { useEconomicsRuntime } from './useEconomicsRuntime'
import { useAppRuntime } from './useAppRuntime'
import { useRegistrationAppState } from './useRegistrationAppState'
import { openingRoute } from './routes'
import { useSearchAppState } from './useSearchAppState'
import { useWalletRuntime } from './useWalletRuntime'

export function useAppCoreRuntimes(env: DuskDomainsRuntimeEnv) {
  const appRuntime = useAppRuntime(env)
  const {
    connectKit,
    connectOptions,
    indexerClient,
    liveDuskDomainsApp,
    recordSourceContractId,
    runtimeConfig,
    wallet,
  } = appRuntime
  const domainState = useDomainManagementAppState(recordSourceContractId, indexerClient, appRuntime.duskDomainsOnChainClient, runtimeConfig.nodeUrl, appRuntime.marketplaceContractId)
  const openWorkspace = useRef<{ name: string } | null>(null)
  const getWorkspaceToken = useCallback((name: string) => openWorkspace.current?.name === name ? openWorkspace.current : null, [])
  const walletRuntime = useWalletRuntime({
    getWorkspaceToken,
    indexerClient,
    confirmOwnershipWrite: domainState.confirmOwnershipWrite,
    writeAccess: appRuntime.writeAccess,
    connectKit,
    connectOptions,
    liveDuskDomainsApp,
    runtimeConfig,
    wallet,
  })
  const {
    ensureContractAuthorityForLiveWrite,
    ensurePublicBalanceForLiveWrite,
    handleOpenWalletConnection,
    referralLookupKey,
    selectedAuthority,
    selectedTypedPrincipalKey,
    selectedTypedPrincipalResult,
    submitNameWrite,
    walletSession,
  } = walletRuntime
  const registrationState = useRegistrationAppState(`${walletRuntime.walletState.generation}:${walletRuntime.walletState.providerId}:${walletRuntime.walletState.chainId}:${walletRuntime.walletState.selectedProfile?.profileId}:${walletRuntime.selectedAddress}`)
  const searchState = useSearchAppState(`${runtimeConfig.chainId}:${walletRuntime.selectedAddress}`,
    () => ({ route: openingRoute(), indexed: Boolean(indexerClient) }))
  useLayoutEffect(() => {
    const name = searchState.mainView === 'search' && searchState.checked ? searchState.apiSearchResult?.canonical : null
    openWorkspace.current = name ? { name } : null
    return () => { openWorkspace.current = null }
  }, [searchState.mainView, searchState.checked, searchState.apiSearchResult?.canonical])
  const economicsRuntime = useEconomicsRuntime({
    indexerClient,
    liveDuskDomainsApp,
    mainView: searchState.mainView,
    onOpenWalletConnection: () => void handleOpenWalletConnection(),
    runtimeConfig,
    selectedAuthority,
    selectedReferralKey: referralLookupKey,
    selectedTypedPrincipalKey,
    selectedTypedPrincipalResult,
    submitNameWrite,
    walletSession,
    ensureContractAuthorityForLiveWrite,
    ensurePublicBalanceForLiveWrite,
  })

  return {
    appRuntime,
    domainState,
    economicsRuntime,
    registrationState,
    searchState,
    walletRuntime,
  }
}

export type AppCoreRuntimes = ReturnType<typeof useAppCoreRuntimes>
