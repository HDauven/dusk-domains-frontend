import { Button } from '../../../components/ui/Button'
import { TermPicker } from '../../../components/ui/TermPicker'
import { formatDusk } from '../../../utils/format'
import { formatLifecycleDay, lifecycleHeightReached, renewalDeadline, renewalWindowCopy } from '../domainFormat'
import { ManagementFeedback } from '../ManagementFeedback'
import type { RenewalPanelProps } from './types'

export function RenewalPanel({ managedName, renewal, clock }: RenewalPanelProps) {
  const {
    canRenewName,
    feeConfigError,
    feeConfigLoading,
    maxDurationYears,
    minDurationYears,
    onRenewName,
    onRenewalYearsChange,
    renewalBusy,
    renewalError,
    renewalFee,
    renewalPreviewExpiresAt,
    renewalTxState,
    renewalYears,
  } = renewal
  const {
    currentBlockHeight,
    nowSeconds,
  } = clock
  const renewalClosed = lifecycleHeightReached(renewalDeadline(managedName), currentBlockHeight, nowSeconds)

  return (
    <div className="renewal-box" aria-label="Renewal controls">
      <div>
        <h3>Renew</h3>
        {managedName.ownerIsContract ? <p>Renewal adds time and does not change the owner.</p> : null}
        <p>{renewalWindowCopy(managedName, currentBlockHeight, nowSeconds)}</p>
      </div>

      {renewalClosed ? null : (
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
            <Button variant="primary"
              className="compact"
              disabled={!canRenewName} loading={renewalBusy}
              type="button"
              onClick={() => void onRenewName()}
            >
              Renew
            </Button>
          </div>
        </>
      )}

      <ManagementFeedback error={renewalError} txState={renewalTxState} />
    </div>
  )
}
