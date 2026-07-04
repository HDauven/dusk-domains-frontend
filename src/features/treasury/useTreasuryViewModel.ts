import { useMemo } from 'react'
import {
  principalKey,
  typedPrincipalFromWalletAccount,
  type CoreFeeConfig,
  type DuskNameTxState,
  type IndexedTreasuryState,
  isDuskNameTxBusy,
} from '../../names/internal'
import {
  feeConfigValuesMatch,
  parseDuskAmountToLux,
  parseFeeConfigForm,
  type FeeConfigFormState,
} from './feeConfig'

type UseTreasuryViewModelArgs = {
  feeConfig: CoreFeeConfig
  feeConfigForm: FeeConfigFormState
  feeConfigTxState: DuskNameTxState | null
  liveWritesAvailable: boolean
  selectedAddress: string
  selectedTypedPrincipalKey: string
  treasuryClaimAmount: string
  treasuryLoading: boolean
  treasuryState: IndexedTreasuryState
  treasuryTxState: DuskNameTxState | null
}

export function useTreasuryViewModel({
  feeConfig,
  feeConfigForm,
  feeConfigTxState,
  liveWritesAvailable,
  selectedAddress,
  selectedTypedPrincipalKey,
  treasuryClaimAmount,
  treasuryLoading,
  treasuryState,
  treasuryTxState,
}: UseTreasuryViewModelArgs) {
  const treasuryOperatorKey = principalKey(treasuryState.operator) || treasuryState.operatorAuthority?.toLowerCase() || ''
  const treasuryRecipientPrincipalResult = useMemo(
    () => treasuryState.operatorRecipient ? typedPrincipalFromWalletAccount(treasuryState.operatorRecipient) : null,
    [treasuryState.operatorRecipient],
  )
  const treasuryRecipientKey = treasuryRecipientPrincipalResult?.ok ? principalKey(treasuryRecipientPrincipalResult.principal) : ''
  const treasuryRecipientMatchesOperator = Boolean(treasuryOperatorKey && treasuryRecipientKey && treasuryOperatorKey === treasuryRecipientKey)
  const treasuryAvailable = treasuryState.availableLux > 0
  const connectedAsTreasuryOperator = Boolean(selectedTypedPrincipalKey && treasuryOperatorKey && selectedTypedPrincipalKey === treasuryOperatorKey)
  const treasuryBusy = isDuskNameTxBusy(treasuryTxState)
  const feeConfigBusy = isDuskNameTxBusy(feeConfigTxState)
  const parsedFeeConfigForm = useMemo(() => parseFeeConfigForm(feeConfigForm), [feeConfigForm])
  const feeConfigFormError = parsedFeeConfigForm.ok ? '' : parsedFeeConfigForm.error
  const feeConfigChanged = parsedFeeConfigForm.ok ? !feeConfigValuesMatch(feeConfig, parsedFeeConfigForm.config) : false
  const canUpdateFeeConfig = Boolean(
    connectedAsTreasuryOperator
    && liveWritesAvailable
    && !feeConfigBusy
    && parsedFeeConfigForm.ok
    && feeConfigChanged,
  )
  const treasuryClaimAmountLuxBigInt = useMemo(() => parseDuskAmountToLux(treasuryClaimAmount), [treasuryClaimAmount])
  const treasuryClaimAmountLux = treasuryClaimAmountLuxBigInt === null || treasuryClaimAmountLuxBigInt > BigInt(Number.MAX_SAFE_INTEGER)
    ? null
    : Number(treasuryClaimAmountLuxBigInt)
  const treasuryClaimAmountError = treasuryClaimAmount.trim()
    ? treasuryClaimAmountLuxBigInt === null
      ? 'Enter a valid DUSK amount.'
      : treasuryClaimAmountLuxBigInt <= 0n
        ? 'Enter more than 0 DUSK.'
        : treasuryClaimAmountLuxBigInt > BigInt(treasuryState.availableLux)
          ? 'Amount exceeds available balance.'
          : treasuryClaimAmountLuxBigInt > BigInt(Number.MAX_SAFE_INTEGER)
            ? 'Amount is too large for this client.'
            : ''
    : ''
  const canClaimTreasury = Boolean(connectedAsTreasuryOperator && treasuryAvailable && !treasuryLoading && !treasuryBusy)
  const canClaimTreasuryPartial = Boolean(canClaimTreasury && treasuryClaimAmountLux !== null && treasuryClaimAmountLux > 0 && !treasuryClaimAmountError)
  const showTreasuryClaimControls = Boolean(selectedAddress && connectedAsTreasuryOperator && liveWritesAvailable && treasuryAvailable)
  const treasuryWalletStatus = !selectedAddress
    ? 'Connect operator'
    : !treasuryState.initialized
      ? 'Unavailable'
      : !connectedAsTreasuryOperator
        ? 'View only'
        : liveWritesAvailable
          ? 'Ready'
          : 'Read only'
  const treasuryClaimGuidance = !treasuryState.initialized
    ? 'Treasury data is not available yet.'
    : !selectedAddress
      ? 'Connect the operator wallet to claim fees.'
      : !connectedAsTreasuryOperator
        ? 'View only. Connect the operator wallet to claim.'
        : !liveWritesAvailable
          ? 'Use a transaction-capable Dusk Wallet to claim.'
          : treasuryAvailable
            ? 'Claims pay the configured recipient.'
            : 'No treasury balance is available to claim.'
  const treasuryClaimAmountEntered = treasuryClaimAmount.trim().length > 0
  const treasuryReviewAmountLux = treasuryClaimAmountEntered
    ? canClaimTreasuryPartial && treasuryClaimAmountLux !== null ? treasuryClaimAmountLux : null
    : treasuryState.availableLux
  const showTreasuryClaimReview = Boolean(connectedAsTreasuryOperator && treasuryAvailable && treasuryState.operatorRecipient && treasuryReviewAmountLux !== null)

  return {
    canClaimTreasury,
    canClaimTreasuryPartial,
    canUpdateFeeConfig,
    connectedAsTreasuryOperator,
    feeConfigBusy,
    feeConfigFormError,
    showTreasuryClaimControls,
    showTreasuryClaimReview,
    treasuryAvailable,
    treasuryBusy,
    treasuryClaimAmountError,
    treasuryClaimAmountLux,
    treasuryClaimGuidance,
    treasuryConnectedWalletLabel: liveWritesAvailable ? 'Signing wallet' : 'Connected wallet',
    treasuryRecipientMatchesOperator,
    treasuryReviewAmountLux,
    treasuryReviewLabel: liveWritesAvailable ? 'Review claim' : 'Claim preview',
    treasuryWalletStatus,
  }
}
