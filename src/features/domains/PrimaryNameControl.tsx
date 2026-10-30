import { useId } from 'react'
import { Button } from '../../components/ui/Button'
import { Switch } from '../../components/ui/Switch'
import type { DuskDomainTxState } from '../../names/internal'
import { ManagementFeedback } from './ManagementFeedback'
import type { PrimarySwitch } from './setPrimaryDomainName'

// A primary name kept in another shard is cleared there first: two approvals, named before the first.
function PrimarySwitchSteps({ primarySwitch: { current, target, step }, onConfirm, onCancel }: {
  primarySwitch: PrimarySwitch
  onConfirm: () => void
  onCancel: () => void
}) {
  if (step === 'clearing') return <p className="primary-switch" role="status">Approval 1 of 2: clearing {current} as your primary name.</p>
  if (step === 'setting') return <p className="primary-switch" role="status">Approval 2 of 2: setting {target} as your primary name.</p>
  return <div className="primary-switch" role="group" aria-label={`Make ${target} your primary name`}>
    <p><strong>{current} is your primary name now, kept in a different shard from {target}.</strong>{' '}
      Making {target} your primary name takes two wallet approvals: the first clears {current} as your primary name, the second sets {target}.</p>
    <div className="primary-switch-actions">
      <Button type="button" variant="primary" onClick={onConfirm}>Clear {current} and continue</Button>
      <Button type="button" onClick={onCancel}>Cancel</Button>
    </div>
  </div>
}

export function PrimaryNameControl({ canClearPrimary, canSetPrimary, displayName, error, onClearPrimary, onSetPrimary, onOpenRecords, onDismissFeedback, primarySwitch = null, onConfirmPrimarySwitch, onCancelPrimarySwitch, primaryVerification, txState }: {
  canClearPrimary: boolean
  canSetPrimary: boolean
  displayName: string
  error: string
  onClearPrimary: () => void
  onSetPrimary: () => void
  /** Opens the name's Records section, where its Dusk address is set. */
  onOpenRecords?: () => void
  onDismissFeedback?: () => void
  /** A change to this name that takes two approvals, while it is reviewed or under way. */
  primarySwitch?: PrimarySwitch | null
  onConfirmPrimarySwitch?: () => void
  onCancelPrimarySwitch?: () => void
  /** `addressRecord`: the name's own Dusk address record is missing, or holds another address than the wallet's. */
  primaryVerification: { verified: boolean; cleanupDescription?: string; addressRecord?: 'missing' | 'other' | null }
  txState: DuskDomainTxState | null
}) {
  const enabled = primaryVerification.verified
  const id = useId()
  const records = onOpenRecords ? <Button variant="quiet" className="inline-action" onClick={onOpenRecords}>Records</Button> : 'Records'
  // The switch needs the name's own Dusk address to be the wallet's: say so before it is tried.
  const description = enabled ? `Apps show ${displayName} for this Dusk address.`
    : primaryVerification.cleanupDescription ? primaryVerification.cleanupDescription
      : primaryVerification.addressRecord === 'missing' ? <>Add your Dusk address under {records} first, then turn this on.</>
        : primaryVerification.addressRecord === 'other' ? <>{displayName} points to another Dusk address. Change it to yours under {records} first, then turn this on.</>
          : `Turn on to use ${displayName} as the primary name for your Dusk address.`
  return <div className="primary-control">
    <div className="primary-control-row">
      <div><label id={`${id}-label`} htmlFor={id}>Primary name</label><p id={`${id}-description`}>{description}</p></div>
      <Switch id={id} aria-labelledby={`${id}-label`} aria-describedby={`${id}-description`} checked={enabled}
        disabled={Boolean(primarySwitch) || (enabled ? !canClearPrimary : !canSetPrimary)} onCheckedChange={checked => checked ? onSetPrimary() : onClearPrimary()} />
    </div>
    {primarySwitch ? <PrimarySwitchSteps primarySwitch={primarySwitch} onConfirm={() => onConfirmPrimarySwitch?.()} onCancel={() => onCancelPrimarySwitch?.()} /> : null}
    {enabled && primaryVerification.cleanupDescription ? <p>{primaryVerification.cleanupDescription}</p> : null}
    {primaryVerification.cleanupDescription || (!enabled && canClearPrimary) ? <Button type="button" variant="quiet" disabled={!canClearPrimary} onClick={onClearPrimary}>Clear primary name</Button> : null}
    <ManagementFeedback error={error} txState={txState} onDismiss={onDismissFeedback} />
  </div>
}
