import { Minus, Plus } from 'lucide-react'
import { formatLifecycleDay } from '../domainFormat'
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
  return (
    <div className="renewal-box" aria-label="Renewal controls">
      <div>
        <h3>Renewal</h3>
        <p>Current expiry {formatLifecycleDay(managedName.expiresAt, currentBlockHeight, nowSeconds)}. Grace ends {formatLifecycleDay(managedName.graceEndsAt, currentBlockHeight, nowSeconds)}.</p>
      </div>

      <div className="duration-control renewal-duration-control">
        <div className="duration-control-header">
          <div>
            <span>Renewal period</span>
            <strong>{renewalYears} {renewalYears === 1 ? 'year' : 'years'}</strong>
          </div>
          <output>{renewalFee ? `${renewalFee.toFixed(2)} DUSK` : '-'}</output>
        </div>
        <div className="duration-slider-row">
          <button
            aria-label="Decrease renewal duration"
            className="duration-stepper"
            disabled={renewalBusy || renewalYears <= minDurationYears}
            type="button"
            onClick={() => onRenewalYearsChange(renewalYears - 1)}
          >
            <Minus size={16} />
          </button>
          <input
            aria-label="Renewal duration in years"
            className="duration-slider"
            disabled={renewalBusy}
            max={maxDurationYears}
            min={minDurationYears}
            step={1}
            type="range"
            value={renewalYears}
            onChange={(event) => onRenewalYearsChange(Number(event.target.value))}
          />
          <button
            aria-label="Increase renewal duration"
            className="duration-stepper"
            disabled={renewalBusy || renewalYears >= maxDurationYears}
            type="button"
            onClick={() => onRenewalYearsChange(renewalYears + 1)}
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="duration-scale">
          <span>{minDurationYears} year</span>
          <span>{maxDurationYears} years</span>
        </div>
        {feeConfigLoading || feeConfigError ? (
          <p className={feeConfigError ? 'field-note warning' : 'field-note'}>
            {feeConfigError || 'Loading live pricing.'}
          </p>
        ) : null}
      </div>

      <div className="renewal-summary">
        <span>New expiry <strong>{formatLifecycleDay(renewalPreviewExpiresAt, currentBlockHeight, nowSeconds)}</strong></span>
        <span>Renewal fee <strong>{renewalFee.toFixed(2)} DUSK</strong></span>
        <button
          className="commit-button save-record"
          disabled={!canRenewName}
          type="button"
          onClick={() => void onRenewName()}
        >
          Renew domain
        </button>
      </div>

      <ManagementFeedback error={renewalError} txState={renewalTxState} />
    </div>
  )
}
