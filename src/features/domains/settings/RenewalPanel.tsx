import { Button } from '../../../components/ui/Button'
import { TermPicker } from '../../../components/ui/TermPicker'
import { formatDusk, pluralize } from '../../../utils/format'
import { isTechnicalErrorMessage } from '../../../names/internal'
import { formatLifecycleDay, lifecycleHeightReached, renewalDeadline, renewalTermLimit, renewalWindowCopy } from '../domainFormat'
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
    onDismissFeedback,
    renewalYears,
  } = renewal
  const {
    currentBlockHeight,
    nowSeconds,
  } = clock
  const renewalClosed = lifecycleHeightReached(renewalDeadline(managedName), currentBlockHeight, nowSeconds)
  const limit = renewalTermLimit(managedName.expiresAt, currentBlockHeight)
  const maxYears = Math.min(maxDurationYears, limit.maxYears ?? maxDurationYears)
  const atLimit = limit.maxYears === 0
  // A read failure says nothing useful in contract terms; a pricing message stays as written.
  const priceError = feeConfigError && isTechnicalErrorMessage(feeConfigError) ? 'The renewal price could not be read. Try again in a moment.' : feeConfigError

  return (
    <div className="renewal-box" aria-label="Renewal controls">
      <div>
        <h3>Renew</h3>
        {managedName.ownerIsContract ? <p>Renewal adds time and does not change the owner.</p> : null}
        <p>{renewalWindowCopy(managedName, currentBlockHeight, nowSeconds)}</p>
      </div>

      {renewalClosed ? null : atLimit ? (
        <p className="field-note">It already runs close to the 10-year limit. You can add another year from {formatLifecycleDay(limit.nextYearAt ?? 0, currentBlockHeight, nowSeconds)}.</p>
      ) : (
        <>
          <TermPicker
            disabled={renewalBusy}
            label="Renewal term"
            max={maxYears}
            min={minDurationYears}
            value={Math.min(renewalYears, maxYears)}
            onChange={onRenewalYearsChange}
          />
          {limit.maxYears !== null && limit.maxYears < maxDurationYears ? (
            <p className="field-note">A name can run at most 10 years ahead, so you can add up to {maxYears} {pluralize(maxYears, 'year')} now.</p>
          ) : null}
          {feeConfigLoading || priceError ? (
            <p className={priceError ? 'field-note warning' : 'field-note'}>{priceError || 'Loading live pricing.'}</p>
          ) : null}

          <div className="renewal-summary">
            <span>New expiry <strong>{formatLifecycleDay(renewalPreviewExpiresAt, currentBlockHeight, nowSeconds)}</strong></span>
            <span>Price <strong>{renewalFee === null ? '…' : `${formatDusk(renewalFee)} DUSK`}</strong></span>
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

      <ManagementFeedback error={renewalError} txState={renewalTxState} onDismiss={onDismissFeedback} />
    </div>
  )
}
