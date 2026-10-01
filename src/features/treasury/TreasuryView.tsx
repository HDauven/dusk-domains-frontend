import { AccountViewLayout } from '../../components/ui/AccountViewLayout'
import { AccountCard, AccountDetailList, AccountDetailItem } from '../../components/ui/AccountCard'
import { registrationPrice } from '../../names/internal'
import { formatDusk } from '../../utils/format'
import { TreasuryAccountingCard } from './cards/TreasuryAccountingCard'
import { TreasuryClaimCard } from './cards/TreasuryClaimCard'
import { TreasuryClaimHistoryCard } from './cards/TreasuryClaimHistoryCard'
import { TreasuryHeader } from './cards/TreasuryHeader'
import { TreasuryPricingCard } from './cards/TreasuryPricingCard'
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
          treasuryState={treasuryState}
        />
      )}
      labelledBy="treasury-heading"
      panelId="treasury"
    >
      {connectedAsTreasuryOperator ? <TreasuryClaimCard
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
      /> : null}

      <TreasuryAccountingCard treasuryState={treasuryState} />

      {connectedAsTreasuryOperator ? <TreasuryPricingCard
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
      /> : <AccountCard title="Pricing" heading="Yearly prices">
        {feeConfigError ? <p>{feeConfigError}</p> : <AccountDetailList>
          {['abc', 'abcd', 'abcde'].map((label, i) => <AccountDetailItem key={label} label={['3 characters', '4 characters', '5+ characters'][i]} value={`${formatDusk(registrationPrice(label, 1, feeConfig))} DUSK`} />)}
        </AccountDetailList>}
      </AccountCard>}

      <TreasuryClaimHistoryCard treasuryState={treasuryState} />
    </AccountViewLayout>
  )
}
