import { useState, type ComponentProps } from 'react'
import type {
  DuskNamesIndexerClient,
  DuskNamesRuntimeConfig,
  DuskNameTxState,
  DuskPrincipalResult,
} from '../../names/internal'
import type { WalletSessionModel } from '../wallet/walletStatus'
import { ReferralsView } from './ReferralsView'
import { useReferralAccount } from './useReferralAccount'
import { useReferralActions } from './useReferralActions'
import { useReferralControls } from './useReferralControls'
import { useReferralViewModel } from './useReferralViewModel'
import type { SubmitNameWrite } from '../treasury/treasuryActionTypes'

type LiveWritePreflight = {
  ensureContractAuthorityForLiveWrite: (
    action: string,
    setError: (message: string) => void,
  ) => boolean
  ensurePublicBalanceForLiveWrite: (
    action: string,
    setError: (message: string) => void,
    minimumLux?: number,
    depositLux?: bigint,
  ) => Promise<boolean>
}

export function useReferralFeature({
  indexerClient,
  liveDuskNamesApp,
  onOpenWalletConnection,
  runtimeConfig,
  selectedAuthority,
  selectedReferralKey,
  selectedTypedPrincipalResult,
  submitNameWrite,
  walletSession,
  ensureContractAuthorityForLiveWrite,
  ensurePublicBalanceForLiveWrite,
}: {
  indexerClient: DuskNamesIndexerClient | null
  liveDuskNamesApp: unknown
  onOpenWalletConnection: () => void
  runtimeConfig: DuskNamesRuntimeConfig
  selectedAuthority: string
  selectedReferralKey: string
  selectedTypedPrincipalResult: DuskPrincipalResult | null
  submitNameWrite: SubmitNameWrite
  walletSession: WalletSessionModel
} & LiveWritePreflight) {
  const selectedAddress = walletSession.selectedAddress
  const walletSetupState = walletSession.status
  const [referralConfirmation, setReferralConfirmation] = useState('')
  const [referralTxState, setReferralTxState] = useState<DuskNameTxState | null>(null)
  const {
    referralAccountState,
    referralError,
    referralLoading,
    loadReferralAccount,
    setReferralError,
  } = useReferralAccount({
    indexerClient,
    selectedReferralKey,
  })
  const {
    clearReferral,
    copyReferralLink,
    handleReferralInputChange,
    referralCopied,
    referralLink,
    referralState,
    resetReferralCopied,
  } = useReferralControls({
    selectedAddress,
    setReferralError,
  })
  const referralViewModel = useReferralViewModel({
    referralAccountState,
    referralAttributionEnabled: runtimeConfig.capabilities.referralAttribution,
    referralError,
    referralLoading,
    referralRewardClaimsAvailable: Boolean(runtimeConfig.capabilities.referralRewardClaims && liveDuskNamesApp),
    referralState,
    referralTxState,
    selectedAddress,
    selectedAuthority,
    selectedIsMoonlightAccount: Boolean(selectedTypedPrincipalResult?.ok && selectedTypedPrincipalResult.source === 'moonlight_account'),
    selectedReferralKey,
  })
  const {
    handleClaimReferralRewards,
  } = useReferralActions({
    indexerClient,
    liveDuskNamesApp,
    loadReferralAccount,
    referralAccountState,
    referralBusy: referralViewModel.referralBusy,
    referralClaimable: referralViewModel.referralClaimable,
    referralRewardClaimReady: referralViewModel.referralRewardClaimReady,
    runtimeConfig,
    selectedAddress,
    selectedAuthority,
    setReferralConfirmation,
    setReferralError,
    setReferralTxState,
    submitNameWrite,
    ensureContractAuthorityForLiveWrite,
    ensurePublicBalanceForLiveWrite,
  })

  const referralsProps: ComponentProps<typeof ReferralsView> = {
    ...referralViewModel,
    onClaimReferralRewards: () => void handleClaimReferralRewards(),
    onClearReferral: clearReferral,
    onCopyReferralLink: () => void copyReferralLink(),
    onOpenWalletConnection,
    onRefresh: () => void loadReferralAccount(),
    onReferralInputChange: handleReferralInputChange,
    referralAccountState,
    referralConfirmation,
    referralCopied,
    referralError,
    referralLink,
    referralLoading,
    referralState,
    referralTxState,
    selectedAddress,
    walletSetupState,
  }

  return {
    activeReferral: referralViewModel.activeReferral,
    appliedReferral: referralViewModel.appliedReferral,
    loadReferralAccount,
    referralsProps,
    resetReferralCopied,
  }
}
