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
    browserWriteProofUrl,
    connectKit,
    connectOptions,
    indexerClient,
    liveDuskDomainsApp,
    recordSourceContractId,
    runtimeConfig,
    wallet,
  } = appRuntime
  const searchState = useSearchAppState()
  const registrationState = useRegistrationAppState()
  const domainState = useDomainManagementAppState(recordSourceContractId)
  const walletRuntime = useWalletRuntime({
    captureUrl: browserWriteProofUrl,
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
