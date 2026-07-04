import { ArrowRight, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { TransactionStatusNotice } from '../../../components/status/TransactionStatusNotice'
import { txStatusCopy } from '../../../components/status/txStatus'
import { AccountCard } from '../../../components/ui/AccountCard'
import { PanelMessage } from '../../../components/ui/PanelMessage'
import { walletActionLabel, walletActionTitle } from '../../wallet/walletStatus'
import { FeeConfigInput } from './FeeConfigInput'
import type { TreasuryPricingCardProps } from './types'

export function TreasuryPricingCard({
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
  onFeeConfigFieldChange,
  onOpenWalletConnection,
  onUpdateFeeConfig,
  selectedAddress,
  walletSetupState,
}: TreasuryPricingCardProps) {
  return (
    <AccountCard
      className="fee-config-card"
      heading={feeConfigLoading ? 'Loading' : `v${feeConfig.version}`}
      intro="Operator-controlled annual prices and referral rewards."
      title="Pricing"
    >
      <div className="fee-config-grid">
        <FeeConfigInput
          id="fee-3-char"
          label="3 characters"
          value={feeConfigForm.threeCharYearDusk}
          onChange={(value) => onFeeConfigFieldChange('threeCharYearDusk', value)}
        />
        <FeeConfigInput
          id="fee-4-char"
          label="4 characters"
          value={feeConfigForm.fourCharYearDusk}
          onChange={(value) => onFeeConfigFieldChange('fourCharYearDusk', value)}
        />
        <FeeConfigInput
          id="fee-5-plus"
          label="5+ characters"
          value={feeConfigForm.fivePlusYearDusk}
          onChange={(value) => onFeeConfigFieldChange('fivePlusYearDusk', value)}
        />
        <FeeConfigInput
          help="0-30% of first registration"
          id="fee-referral"
          label="Registration referral"
          value={feeConfigForm.referralRewardPercent}
          onChange={(value) => onFeeConfigFieldChange('referralRewardPercent', value)}
        />
        <FeeConfigInput
          help="0-30% of renewal fee"
          id="fee-renewal-referral"
          label="Renewal referral"
          value={feeConfigForm.renewalReferralRewardPercent}
          onChange={(value) => onFeeConfigFieldChange('renewalReferralRewardPercent', value)}
        />
      </div>
      {feeConfigError ? (
        <PanelMessage icon={<Info size={18} />} tone="subtle">{feeConfigError}</PanelMessage>
      ) : null}
      {(feeConfigFormError || feeConfigUpdateError) ? (
        <PanelMessage icon={<AlertTriangle size={18} />} tone="danger">
          {feeConfigUpdateError || feeConfigFormError}
        </PanelMessage>
      ) : null}
      {feeConfigConfirmation ? (
        <PanelMessage icon={<CheckCircle2 size={18} />} tone="success">{feeConfigConfirmation}</PanelMessage>
      ) : null}
      <div className="fee-config-actions">
        {!selectedAddress ? (
          <button
            className="primary-button compact"
            disabled={walletSetupState === 'detecting'}
            title={walletActionTitle(walletSetupState)}
            type="button"
            onClick={() => void onOpenWalletConnection()}
          >
            {walletActionLabel(walletSetupState)}
            <ArrowRight size={18} />
          </button>
        ) : null}
        <button
          className="commit-button save-record"
          disabled={!canUpdateFeeConfig}
          type="button"
          onClick={() => void onUpdateFeeConfig()}
        >
          {feeConfigBusy ? txStatusCopy(feeConfigTxState?.status, feeConfigTxState?.message) : 'Update pricing'}
        </button>
      </div>
      {selectedAddress && !connectedAsTreasuryOperator ? <p className="secure-note">Only the operator wallet can update pricing.</p> : null}
      {feeConfigTxState ? <TransactionStatusNotice state={feeConfigTxState} /> : null}
    </AccountCard>
  )
}
