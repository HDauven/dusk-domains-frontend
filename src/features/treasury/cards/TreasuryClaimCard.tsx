import { Button } from '../../../components/ui/Button'
import { ArrowRight } from 'lucide-react'
import { TransactionStatusNotice } from '../../../components/status/TransactionStatusNotice'
import { txStatusCopy } from '../../../components/status/txStatus'
import { AccountCard, AccountDetailItem, AccountDetailList } from '../../../components/ui/AccountCard'
import { ClaimReview } from '../../../components/ui/ClaimReview'
import { TextField } from '../../../components/ui/FormControls'
import { principalLabel, principalShortValue } from '../../../names/internal'
import { abbreviate } from '../../../utils/format'
import { walletActionLabel, walletActionTitle } from '../../wallet/walletStatus'
import { formatLuxNumberAsDusk } from '../feeConfig'
import type { TreasuryClaimCardProps } from './types'

export function TreasuryClaimCard({ treasuryState, claim, wallet }: TreasuryClaimCardProps) {
  const {
    canClaimTreasury,
    canClaimTreasuryPartial,
    onClaimTreasury,
    onTreasuryClaimAmountChange,
    showTreasuryClaimControls,
    showTreasuryClaimReview,
    treasuryAvailable,
    treasuryBusy,
    treasuryClaimAmount,
    treasuryClaimAmountError,
    treasuryClaimGuidance,
    treasuryRecipientMatchesOperator,
    treasuryReviewAmountLux,
    treasuryReviewLabel,
    treasuryTxState,
  } = claim
  const {
    connectedAsTreasuryOperator,
    liveWritesAvailable,
    onOpenWalletConnection,
    selectedAddress,
    treasuryConnectedWalletLabel,
    treasuryWalletStatus,
    walletSetupState,
  } = wallet
  const operatorValue = treasuryRecipientMatchesOperator && treasuryState.operatorRecipient
    ? abbreviate(treasuryState.operatorRecipient)
    : principalLabel(treasuryState.operator)
  const showOperatorId = Boolean(treasuryState.operator && !treasuryRecipientMatchesOperator)

  return (
    <AccountCard
      className="primary-account-card"
      heading={formatLuxNumberAsDusk(treasuryState.availableLux)}
      intro={treasuryClaimGuidance}
      title="Available"
    >
      <AccountDetailList>
        <AccountDetailItem
          asCode
          label="Payout address"
          value={treasuryState.operatorRecipient ? abbreviate(treasuryState.operatorRecipient) : '-'}
        />
        {treasuryRecipientMatchesOperator ? (
          <AccountDetailItem label="Recipient" value="Same wallet as operator" />
        ) : null}
        <AccountDetailItem asCode={treasuryRecipientMatchesOperator} label="Operator" value={operatorValue} />
        {showOperatorId ? (
          <AccountDetailItem asCode label="Operator ID" value={principalShortValue(treasuryState.operator)} />
        ) : null}
        <AccountDetailItem
          asCode={Boolean(selectedAddress)}
          label={treasuryConnectedWalletLabel}
          value={selectedAddress ? abbreviate(selectedAddress) : treasuryWalletStatus}
        />
      </AccountDetailList>
      {showTreasuryClaimReview && treasuryReviewAmountLux !== null ? (
        <ClaimReview
          ariaLabel="Treasury claim review"
          rows={[
            { label: treasuryReviewLabel, value: formatLuxNumberAsDusk(treasuryReviewAmountLux) },
            { asCode: true, label: 'Recipient', value: abbreviate(treasuryState.operatorRecipient ?? '') },
            { asCode: true, label: treasuryConnectedWalletLabel, value: selectedAddress ? abbreviate(selectedAddress) : '-' },
          ]}
        />
      ) : null}
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
      {showTreasuryClaimControls ? (
        <div className="treasury-claim-control">
          <TextField
            id="treasury-claim-amount"
            hint={treasuryClaimAmountError || `${formatLuxNumberAsDusk(treasuryState.availableLux)} available`}
            inputMode="decimal"
            label="Claim amount"
            placeholder="0.00"
            value={treasuryClaimAmount}
            onChange={(event) => onTreasuryClaimAmountChange(event.target.value)}
          />
          <div className="treasury-claim-actions">
            <Button
              className="save-record"
              disabled={!canClaimTreasuryPartial || !liveWritesAvailable}
              type="button"
              onClick={() => void onClaimTreasury('partial')}
            >
              Claim amount
            </Button>
            <Button variant="primary"
              className="compact"
              disabled={!canClaimTreasury || !liveWritesAvailable}
              type="button"
              onClick={() => void onClaimTreasury('all')}
            >
              {treasuryBusy ? txStatusCopy(treasuryTxState?.status, treasuryTxState?.message) : 'Claim all'}
              <ArrowRight size={18} />
            </Button>
          </div>
        </div>
      ) : null}
      {!connectedAsTreasuryOperator && selectedAddress ? <p className="secure-note">Only the operator wallet can claim.</p> : null}
      {connectedAsTreasuryOperator && treasuryAvailable ? (
        <p className="secure-note">Claims use the configured recipient.</p>
      ) : null}
      {treasuryTxState ? <TransactionStatusNotice state={treasuryTxState} /> : null}
    </AccountCard>
  )
}
