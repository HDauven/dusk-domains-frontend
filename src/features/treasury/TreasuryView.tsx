import { AccountViewLayout } from '../../components/ui/AccountViewLayout'
import {
  TreasuryAccountingCard,
  TreasuryClaimCard,
  TreasuryClaimHistoryCard,
  TreasuryHeader,
  TreasuryPricingCard,
} from './TreasuryCards'
import type { TreasuryViewProps } from './treasuryViewTypes'

export function TreasuryView({
  canClaimTreasury,
  canClaimTreasuryPartial,
  canUpdateFeeConfig,
  connectedAsTreasuryOperator,
  feeConfig,
  feeConfigBusy,
  feeConfigConfirmation,
  feeConfigError,
  feeConfigForm,
  feeConfigFormError,
  feeConfigLoading,
  feeConfigTxState,
  feeConfigUpdateError,
  liveWritesAvailable,
  onClaimTreasury,
  onFeeConfigFieldChange,
  onOpenWalletConnection,
  onRefresh,
  onTreasuryClaimAmountChange,
  onUpdateFeeConfig,
  selectedAddress,
  showTreasuryClaimControls,
  showTreasuryClaimReview,
  treasuryAvailable,
  treasuryBusy,
  treasuryClaimAmount,
  treasuryClaimAmountError,
  treasuryClaimGuidance,
  treasuryConfirmation,
  treasuryConnectedWalletLabel,
  treasuryError,
  treasuryLoading,
  treasuryRecipientMatchesOperator,
  treasuryReviewAmountLux,
  treasuryReviewLabel,
  treasuryState,
  treasuryTxState,
  treasuryWalletStatus,
  walletSetupState,
}: TreasuryViewProps) {
  return (
    <AccountViewLayout
      className="treasury-panel"
      confirmation={treasuryConfirmation}
      confirmationTone="default"
      error={treasuryError}
      header={(
        <TreasuryHeader
          feeConfigLoading={feeConfigLoading}
          onRefresh={onRefresh}
          treasuryLoading={treasuryLoading}
          treasuryState={treasuryState}
        />
      )}
      labelledBy="treasury-heading"
      panelId="treasury"
    >
      <TreasuryClaimCard
        canClaimTreasury={canClaimTreasury}
        canClaimTreasuryPartial={canClaimTreasuryPartial}
        connectedAsTreasuryOperator={connectedAsTreasuryOperator}
        liveWritesAvailable={liveWritesAvailable}
        onClaimTreasury={onClaimTreasury}
        onOpenWalletConnection={onOpenWalletConnection}
        onTreasuryClaimAmountChange={onTreasuryClaimAmountChange}
        selectedAddress={selectedAddress}
        showTreasuryClaimControls={showTreasuryClaimControls}
        showTreasuryClaimReview={showTreasuryClaimReview}
        treasuryAvailable={treasuryAvailable}
        treasuryBusy={treasuryBusy}
        treasuryClaimAmount={treasuryClaimAmount}
        treasuryClaimAmountError={treasuryClaimAmountError}
        treasuryClaimGuidance={treasuryClaimGuidance}
        treasuryConnectedWalletLabel={treasuryConnectedWalletLabel}
        treasuryRecipientMatchesOperator={treasuryRecipientMatchesOperator}
        treasuryReviewAmountLux={treasuryReviewAmountLux}
        treasuryReviewLabel={treasuryReviewLabel}
        treasuryState={treasuryState}
        treasuryTxState={treasuryTxState}
        treasuryWalletStatus={treasuryWalletStatus}
        walletSetupState={walletSetupState}
      />

      <TreasuryAccountingCard treasuryState={treasuryState} />

      <TreasuryPricingCard
        canUpdateFeeConfig={canUpdateFeeConfig}
        connectedAsTreasuryOperator={connectedAsTreasuryOperator}
        feeConfig={feeConfig}
        feeConfigBusy={feeConfigBusy}
        feeConfigConfirmation={feeConfigConfirmation}
        feeConfigError={feeConfigError}
        feeConfigForm={feeConfigForm}
        feeConfigFormError={feeConfigFormError}
        feeConfigLoading={feeConfigLoading}
        feeConfigTxState={feeConfigTxState}
        feeConfigUpdateError={feeConfigUpdateError}
        onFeeConfigFieldChange={onFeeConfigFieldChange}
        onOpenWalletConnection={onOpenWalletConnection}
        onUpdateFeeConfig={onUpdateFeeConfig}
        selectedAddress={selectedAddress}
        walletSetupState={walletSetupState}
      />

      <TreasuryClaimHistoryCard treasuryState={treasuryState} />
    </AccountViewLayout>
  )
}
