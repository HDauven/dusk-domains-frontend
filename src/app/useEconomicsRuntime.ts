import { useEffect } from 'react'
import { useReferralFeature } from '../features/referrals/useReferralFeature'
import { useFeeConfig } from '../features/treasury/useFeeConfig'
import { useTreasuryFeature } from '../features/treasury/useTreasuryFeature'
import type { AppMainView } from './AppTypes'

type TreasuryFeatureArgs = Parameters<typeof useTreasuryFeature>[0]
type ReferralFeatureArgs = Parameters<typeof useReferralFeature>[0]

type UseEconomicsRuntimeArgs =
  & Omit<TreasuryFeatureArgs, 'feeConfig' | 'feeConfigError' | 'feeConfigLoading' | 'loadFeeConfig'>
  & Pick<ReferralFeatureArgs, 'selectedAuthority' | 'selectedReferralKey' | 'selectedTypedPrincipalResult'>
  & {
    mainView: AppMainView
  }

export function useEconomicsRuntime({
  indexerClient,
  liveDuskDomainsApp,
  mainView,
  onOpenWalletConnection,
  runtimeConfig,
  selectedAuthority,
  selectedReferralKey,
  selectedTypedPrincipalKey,
  selectedTypedPrincipalResult,
  submitNameWrite,
  walletSession,
  ensureContractAuthorityForLiveWrite,
  ensurePublicBalanceForLiveWrite,
}: UseEconomicsRuntimeArgs) {
  const {
    feeConfig,
    feeConfigError,
    feeConfigLoading,
    loadFeeConfig,
  } = useFeeConfig(indexerClient)

  const {
    loadTreasuryView,
    treasuryProps,
  } = useTreasuryFeature({
    indexerClient,
    feeConfig,
    feeConfigError,
    feeConfigLoading,
    liveDuskDomainsApp,
    loadFeeConfig,
    onOpenWalletConnection,
    runtimeConfig,
    selectedTypedPrincipalKey,
    submitNameWrite,
    walletSession,
    ensureContractAuthorityForLiveWrite,
    ensurePublicBalanceForLiveWrite,
  })

  const {
    activeReferral,
    appliedReferral,
    loadReferralAccount,
    referralsProps,
    resetReferralCopied,
  } = useReferralFeature({
    indexerClient,
    liveDuskDomainsApp,
    onOpenWalletConnection,
    runtimeConfig,
    selectedAuthority,
    selectedReferralKey,
    selectedTypedPrincipalResult,
    submitNameWrite,
    walletSession,
    ensureContractAuthorityForLiveWrite,
    ensurePublicBalanceForLiveWrite,
  })

  useEffect(() => {
    if (mainView !== 'referrals') return
    globalThis.queueMicrotask(() => {
      void loadReferralAccount()
    })
  }, [loadReferralAccount, mainView])

  return {
    activeReferral,
    appliedReferral,
    feeConfig,
    feeConfigError,
    feeConfigLoading,
    loadReferralAccount,
    loadTreasuryView,
    referralsProps,
    resetReferralCopied,
    treasuryProps,
  }
}
