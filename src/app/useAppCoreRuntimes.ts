import type { DuskDomainsRuntimeEnv } from '../names/internal'
import { useDomainManagementAppState } from './useDomainManagementAppState'
import { useEconomicsRuntime } from './useEconomicsRuntime'
import { useAppRuntime } from './useAppRuntime'
import { useRegistrationAppState } from './useRegistrationAppState'
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
  const registrationState = useRegistrationAppState()
  const domainState = useDomainManagementAppState(recordSourceContractId, indexerClient, appRuntime.duskDomainsOnChainClient)
  const walletRuntime = useWalletRuntime({
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
  const searchState = useSearchAppState(`${runtimeConfig.chainId}:${walletRuntime.selectedAddress}`)
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
