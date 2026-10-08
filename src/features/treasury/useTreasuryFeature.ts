import type { RefreshOptions } from '../../app/singleFlight'
import { useCallback } from 'react'
import type { UseTreasuryFeatureArgs } from './treasuryFeatureTypes'
import type { TreasuryViewProps } from './treasuryViewTypes'
import { useTreasuryAccount } from './useTreasuryAccount'
import { useTreasuryActions } from './useTreasuryActions'
import { useTreasuryControls } from './useTreasuryControls'
import { useTreasuryFeedbackState } from './useTreasuryFeedbackState'
import { useTreasuryViewModel } from './useTreasuryViewModel'

export function useTreasuryFeature({
  indexerClient,
  feeConfig,
  feeConfigError,
  feeConfigLoaded,
  feeConfigLoading,
  liveDuskDomainsApp,
  loadFeeConfig,
  runtimeConfig,
  selectedTypedPrincipalKey,
  submitNameWrite,
  walletSession,
  ensureContractAuthorityForLiveWrite,
  ensurePublicBalanceForLiveWrite,
  onOpenWalletConnection,
}: UseTreasuryFeatureArgs) {
  const selectedAddress = walletSession.selectedAddress
  const walletSetupState = walletSession.status
  const feedbackState = useTreasuryFeedbackState()
  const {
    feeConfigConfirmation,
    feeConfigTxState,
    feeConfigUpdateError,
    setFeeConfigConfirmation,
    setFeeConfigTxState,
    setFeeConfigUpdateError,
    setTreasuryConfirmation,
    setTreasuryTxState,
    treasuryConfirmation,
    treasuryTxState,
  } = feedbackState
  const {
    treasuryLoaded,
    treasuryError,
    treasuryLoading,
    treasuryState,
    loadTreasury,
    setTreasuryError,
  } = useTreasuryAccount(indexerClient)
  const loadTreasuryView = useCallback(async (options?: RefreshOptions) => {
    const [treasuryLoaded, feeConfigLoaded] = await Promise.all([
      loadTreasury(options),
      loadFeeConfig(options),
    ])
    return treasuryLoaded && feeConfigLoaded
  }, [loadFeeConfig, loadTreasury])
  const {
    feeConfigForm,
    handleFeeConfigFieldChange,
    handleTreasuryClaimAmountChange,
    resetTreasuryClaimAmount,
    treasuryClaimAmount,
  } = useTreasuryControls({
    feeConfig,
    setFeeConfigConfirmation,
    setFeeConfigUpdateError,
    setTreasuryConfirmation,
    setTreasuryError,
  })
  const treasuryViewModel = useTreasuryViewModel({
    feeConfig,
    feeConfigForm,
    feeConfigTxState,
    liveWritesAvailable: Boolean(liveDuskDomainsApp),
    selectedAddress,
    selectedTypedPrincipalKey,
    treasuryClaimAmount,
    treasuryLoading,
    treasuryState,
    treasuryTxState,
  })
  const {
    handleClaimTreasury,
    handleUpdateFeeConfig,
  } = useTreasuryActions({
    connectedAsTreasuryOperator: treasuryViewModel.connectedAsTreasuryOperator,
    feeConfig,
    feeConfigBusy: treasuryViewModel.feeConfigBusy,
    feeConfigForm,
    indexerClient,
    liveDuskDomainsApp,
    loadFeeConfig,
    loadTreasury,
    resetTreasuryClaimAmount,
    runtimeConfig,
    selectedAddress,
    setFeeConfigConfirmation,
    setFeeConfigTxState,
    setFeeConfigUpdateError,
    setTreasuryConfirmation,
    setTreasuryError,
    setTreasuryTxState,
    submitNameWrite,
    treasuryAvailable: treasuryViewModel.treasuryAvailable,
    treasuryBusy: treasuryViewModel.treasuryBusy,
    treasuryClaimAmountError: treasuryViewModel.treasuryClaimAmountError,
    treasuryClaimAmountLux: treasuryViewModel.treasuryClaimAmountLux,
    treasuryState,
    ensureContractAuthorityForLiveWrite,
    ensurePublicBalanceForLiveWrite,
  })

  const treasuryProps: TreasuryViewProps = {
    treasuryLoaded,
    onRetry: () => void loadTreasuryView(),
    treasuryConfirmation,
    treasuryError,
    treasuryLoading,
    treasuryState,
    claim: {
      canClaimTreasury: treasuryViewModel.canClaimTreasury,
      canClaimTreasuryPartial: treasuryViewModel.canClaimTreasuryPartial,
      showTreasuryClaimControls: treasuryViewModel.showTreasuryClaimControls,
      showTreasuryClaimReview: treasuryViewModel.showTreasuryClaimReview,
      treasuryAvailable: treasuryViewModel.treasuryAvailable,
      treasuryBusy: treasuryViewModel.treasuryBusy,
      treasuryClaimAmountError: treasuryViewModel.treasuryClaimAmountError,
      treasuryClaimGuidance: treasuryViewModel.treasuryClaimGuidance,
      treasuryRecipientMatchesOperator: treasuryViewModel.treasuryRecipientMatchesOperator,
      treasuryReviewAmountLux: treasuryViewModel.treasuryReviewAmountLux,
      treasuryReviewLabel: treasuryViewModel.treasuryReviewLabel,
      onClaimTreasury: (mode) => void handleClaimTreasury(mode),
      onTreasuryClaimAmountChange: handleTreasuryClaimAmountChange,
      treasuryClaimAmount,
      treasuryTxState,
    },
    pricing: {
      canUpdateFeeConfig: treasuryViewModel.canUpdateFeeConfig,
      feeConfigBusy: treasuryViewModel.feeConfigBusy,
      feeConfigFormError: treasuryViewModel.feeConfigFormError,
      feeConfig,
      feeConfigConfirmation,
      feeConfigError,
      feeConfigForm,
      feeConfigLoaded,
      feeConfigLoading,
      feeConfigTxState,
      feeConfigUpdateError,
      onFeeConfigFieldChange: handleFeeConfigFieldChange,
      onUpdateFeeConfig: () => void handleUpdateFeeConfig(),
    },
    wallet: {
      connectedAsTreasuryOperator: treasuryViewModel.connectedAsTreasuryOperator,
      treasuryConnectedWalletLabel: treasuryViewModel.treasuryConnectedWalletLabel,
      treasuryWalletStatus: treasuryViewModel.treasuryWalletStatus,
      liveWritesAvailable: Boolean(liveDuskDomainsApp),
      onOpenWalletConnection,
      selectedAddress,
      walletSetupState,
    },
  }

  return {
    loadTreasury,
    loadTreasuryView,
    treasuryProps,
  }
}
