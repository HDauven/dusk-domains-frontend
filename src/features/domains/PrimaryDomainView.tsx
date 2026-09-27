import { Info } from 'lucide-react'
import { TextField } from '../../components/ui/FormControls'
import { PanelHeader } from '../../components/ui/PanelHeader'
import type { DuskDomainTxState } from '../../names/internal'
import { abbreviate } from '../../utils/format'
import { ManagementFeedback } from './ManagementFeedback'

type PrimaryVerificationSummary = {
  description: string
  displayValue: string
  title: string
  tone: string
  verified: boolean
}

export function PrimaryDomainView({
  canClearPrimary,
  canSetPrimary,
  displayName,
  error,
  onClearPrimary,
  onEndpointChange,
  onSetPrimary,
  placeholder,
  primaryEndpointValue,
  primaryVerification,
  txState,
}: {
  canClearPrimary: boolean
  canSetPrimary: boolean
  displayName: string
  error: string
  onClearPrimary: () => void
  onEndpointChange: (value: string) => void
  onSetPrimary: () => void
  placeholder: string
  primaryEndpointValue: string
  primaryVerification: PrimaryVerificationSummary
  txState: DuskDomainTxState | null
}) {
  return (
    <section className="primary-panel" aria-labelledby="primary-heading">
      <PanelHeader
        badge={primaryVerification.verified ? 'Verified' : 'Address fallback'}
        badgeClassName={primaryVerification.verified ? 'verified' : 'warning'}
        headingId="primary-heading"
        subtitle="The name apps show for a wallet instead of its address."
        title="Primary name"
      />

      <div className="primary-grid">
        <TextField
          id="primary-endpoint"
          hint="Address for this primary domain"
          label="Dusk Public Address"
          placeholder={placeholder}
          value={primaryEndpointValue}
          onChange={(event) => onEndpointChange(event.target.value)}
        />

        <div className={`primary-status ${primaryVerification.tone}`}>
          <strong>{primaryVerification.title}</strong>
          <span>{primaryVerification.description}</span>
          <code>{abbreviate(primaryVerification.displayValue)}</code>
        </div>
      </div>

      <div className="primary-actions">
        <button
          className="commit-button save-record"
          disabled={!canSetPrimary}
          type="button"
          onClick={() => void onSetPrimary()}
        >
          Set as primary
        </button>
        <button
          className="commit-button danger-action"
          disabled={!canClearPrimary}
          type="button"
          onClick={() => void onClearPrimary()}
        >
          Clear primary
        </button>
      </div>

      <div className="public-warning record">
        <Info size={17} />
        <span>Apps show {displayName} when this address matches the Dusk Public Address record.</span>
      </div>

      <ManagementFeedback error={error} txState={txState} />
    </section>
  )
}
