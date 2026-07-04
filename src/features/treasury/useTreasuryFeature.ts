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
  feeConfigLoading,
  liveDuskNamesApp,
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
    treasuryError,
    treasuryLoading,
    treasuryState,
    loadTreasury,
    setTreasuryError,
  } = useTreasuryAccount(indexerClient)
  const loadTreasuryView = useCallback(async () => {
    const [treasuryLoaded, feeConfigLoaded] = await Promise.all([
      loadTreasury(),
      loadFeeConfig(),
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
    liveWritesAvailable: Boolean(liveDuskNamesApp),
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
    liveDuskNamesApp,
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
    ...treasuryViewModel,
    feeConfig,
    feeConfigConfirmation,
    feeConfigError,
    feeConfigForm,
    feeConfigLoading,
    feeConfigTxState,
    feeConfigUpdateError,
    liveWritesAvailable: Boolean(liveDuskNamesApp),
    onClaimTreasury: (mode) => void handleClaimTreasury(mode),
    onFeeConfigFieldChange: handleFeeConfigFieldChange,
    onOpenWalletConnection,
    onRefresh: () => void loadTreasuryView(),
    onTreasuryClaimAmountChange: handleTreasuryClaimAmountChange,
    onUpdateFeeConfig: () => void handleUpdateFeeConfig(),
    selectedAddress,
    treasuryClaimAmount,
    treasuryConfirmation,
    treasuryError,
    treasuryLoading,
    treasuryState,
    treasuryTxState,
    walletSetupState,
  }

  return {
    loadTreasury,
    loadTreasuryView,
    treasuryProps,
  }
}
