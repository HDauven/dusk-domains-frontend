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
  primaryVerification: { verified: boolean }
  txState: DuskDomainTxState | null
}) {
  const enabled = primaryVerification.verified
  const id = useId()
  return <div className="primary-control">
    <div className="primary-control-row">
      <div><label id={`${id}-label`} htmlFor={id}>Primary name</label><p id={`${id}-description`}>Apps show {displayName} for this Dusk address.</p></div>
      <Switch id={id} aria-labelledby={`${id}-label`} aria-describedby={`${id}-description`} checked={enabled} disabled={enabled ? !canClearPrimary : !canSetPrimary} onCheckedChange={checked => checked ? onSetPrimary() : onClearPrimary()} />
    </div>
    {!enabled && canClearPrimary ? <Button type="button" variant="quiet" onClick={onClearPrimary}>Clear primary name</Button> : null}
    <ManagementFeedback error={error} txState={txState} />
  </div>
}
