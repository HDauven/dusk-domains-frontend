import { useId } from 'react'
import { Button } from '../../components/ui/Button'
import { Switch } from '../../components/ui/Switch'
import type { DuskDomainTxState } from '../../names/internal'
import { ManagementFeedback } from './ManagementFeedback'

export function PrimaryNameControl({ canClearPrimary, canSetPrimary, displayName, error, onClearPrimary, onSetPrimary, primaryVerification, txState }: {
  canClearPrimary: boolean
  canSetPrimary: boolean
  displayName: string
  error: string
  onClearPrimary: () => void
  onSetPrimary: () => void
  primaryVerification: { verified: boolean; cleanupDescription?: string }
  txState: DuskDomainTxState | null
}) {
  const enabled = primaryVerification.verified
  const id = useId()
  return <div className="primary-control">
    <div className="primary-control-row">
      <div><label id={`${id}-label`} htmlFor={id}>Primary name</label><p id={`${id}-description`}>{enabled
        ? `Apps show ${displayName} for this Dusk address.`
        : primaryVerification.cleanupDescription ?? `Turn on to use ${displayName} as the primary name for your Dusk address.`}</p></div>
      <Switch id={id} aria-labelledby={`${id}-label`} aria-describedby={`${id}-description`} checked={enabled} disabled={enabled ? !canClearPrimary : !canSetPrimary} onCheckedChange={checked => checked ? onSetPrimary() : onClearPrimary()} />
    </div>
    {enabled && primaryVerification.cleanupDescription ? <p>{primaryVerification.cleanupDescription}</p> : null}
    {primaryVerification.cleanupDescription || (!enabled && canClearPrimary) ? <Button type="button" variant="quiet" disabled={!canClearPrimary} onClick={onClearPrimary}>Clear primary name</Button> : null}
    <ManagementFeedback error={error} txState={txState} />
  </div>
}
