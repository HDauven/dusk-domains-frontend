import { Button } from '../../../components/ui/Button'
import { ArrowRight, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { TransactionStatusNotice } from '../../../components/status/TransactionStatusNotice'
import { txStatusCopy } from '../../../components/status/txStatus'
import { AccountCard } from '../../../components/ui/AccountCard'
import { PanelMessage } from '../../../components/ui/PanelMessage'
import { walletActionLabel, walletActionTitle } from '../../wallet/walletStatus'
import { FeeConfigInput } from './FeeConfigInput'
import type { TreasuryPricingCardProps } from './types'

export function TreasuryPricingCard({ pricing, wallet }: TreasuryPricingCardProps) {
  const {
    canUpdateFeeConfig,
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
    onUpdateFeeConfig,
  } = pricing
  const {
    connectedAsTreasuryOperator,
    onOpenWalletConnection,
    selectedAddress,
    walletSetupState,
  } = wallet
  return (
    <AccountCard
      className="fee-config-card"
      heading="Yearly prices"
      intro={feeConfigLoading ? 'Loading the live price list.' : `Version ${feeConfig.version}. The operator sets the price per year by name length, and the share that goes to referrers.`}
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
          id="fee-premium-start"
          label="Starting premium (DUSK)"
          help="Halves daily for 21 days after grace. Use 0 to disable."
          value={feeConfigForm.premiumStartDusk}
          onChange={(value) => onFeeConfigFieldChange('premiumStartDusk', value)}
        />
        <FeeConfigInput
          id="fee-premium-referral"
          label="Premium referral"
          help="0-30% of the premium. Default: 0%."
          value={feeConfigForm.premiumReferralRewardPercent}
          onChange={(value) => onFeeConfigFieldChange('premiumReferralRewardPercent', value)}
        />
        <FeeConfigInput
          help="0-30% of the base registration fee"
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
          <Button variant="primary"
            className="compact"
            disabled={walletSetupState === 'detecting'}
            title={walletActionTitle(walletSetupState)}
            type="button"
            onClick={() => void onOpenWalletConnection()}
          >
            {walletActionLabel(walletSetupState)}
            <ArrowRight size={18} />
          </Button>
        ) : null}
        <Button
          className="save-record"
          disabled={!canUpdateFeeConfig}
          type="button"
          onClick={() => void onUpdateFeeConfig()}
        >
          {feeConfigBusy ? txStatusCopy(feeConfigTxState?.status, feeConfigTxState?.message) : 'Update pricing'}
        </Button>
      </div>
      {selectedAddress && !connectedAsTreasuryOperator ? <p className="secure-note">Only the operator wallet can update pricing.</p> : null}
      {feeConfigTxState ? <TransactionStatusNotice state={feeConfigTxState} /> : null}
    </AccountCard>
  )
}
