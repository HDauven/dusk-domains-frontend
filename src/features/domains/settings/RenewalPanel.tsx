import { TermPicker } from '../../../components/ui/TermPicker'
import { formatDusk } from '../../../utils/format'
import { formatLifecycleDay, lifecycleHeightReached, renewalWindowCopy } from '../domainFormat'
import { ManagementFeedback } from '../ManagementFeedback'
import type { RenewalPanelProps } from './types'

export function RenewalPanel({
  canRenewName,
  currentBlockHeight,
  feeConfigError,
  feeConfigLoading,
  managedName,
  maxDurationYears,
  minDurationYears,
  nowSeconds,
  onRenewName,
  onRenewalYearsChange,
  renewalBusy,
  renewalError,
  renewalFee,
  renewalPreviewExpiresAt,
  renewalTxState,
  renewalYears,
}: RenewalPanelProps) {
  // An expired name cannot be renewed, so there is no term or price to offer.
  const expired = lifecycleHeightReached(managedName.expiresAt, currentBlockHeight, nowSeconds)

  return (
    <div className="renewal-box" aria-label="Renewal controls">
      <div>
        <h3>Renew</h3>
        <p>{renewalWindowCopy(managedName, currentBlockHeight, nowSeconds)}</p>
      </div>

      {expired ? null : (
        <>
          <TermPicker
            disabled={renewalBusy}
            label="Renewal term"
            max={maxDurationYears}
            min={minDurationYears}
            value={renewalYears}
            onChange={onRenewalYearsChange}
          />
          {feeConfigLoading || feeConfigError ? (
            <p className={feeConfigError ? 'field-note warning' : 'field-note'}>{feeConfigError || 'Loading live pricing.'}</p>
          ) : null}

          <div className="renewal-summary">
            <span>New expiry <strong>{formatLifecycleDay(renewalPreviewExpiresAt, currentBlockHeight, nowSeconds)}</strong></span>
            <span>Price <strong>{formatDusk(renewalFee)} DUSK</strong></span>
            <button
              className="primary-button compact"
              disabled={!canRenewName}
              type="button"
              onClick={() => void onRenewName()}
            >
              Renew
            </button>
          </div>
        </>
      )}

      <ManagementFeedback error={renewalError} txState={renewalTxState} />
    </div>
  )
}
