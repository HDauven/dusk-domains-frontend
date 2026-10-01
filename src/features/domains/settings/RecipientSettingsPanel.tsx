import { routePath } from '../../../app/routes'
import { useRef, useState } from 'react'
import { isDuskDomainTxBusy } from '../../../names/internal'
import { Button } from '../../../components/ui/Button'
import { TextField } from '../../../components/ui/FormControls'
import { CopyValue } from '../../../components/ui/CopyValue'
import { OwnerLabel } from '../../identity/OwnerLabel'
import type { ResolvedRecipient } from '../../identity/resolveRecipient'
import { ManagementFeedback } from '../ManagementFeedback'
import type { RecipientSettingsPanelProps } from './types'

export function RecipientSettingsPanel({ canManageName, confirmationInput, displayName, managedName, managementError, managementTxState, onConfirmationInputChange, onResolveRecipient, onOwnershipUpdate, viewerAuthority, ownerAddresses }: RecipientSettingsPanelProps) {
  const [mode, setMode] = useState<'transfer' | 'manager' | null>(null)
  const [input, setInput] = useState('')
  const [recipient, setRecipient] = useState<ResolvedRecipient | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const revision = useRef(0)
  const writing = isDuskDomainTxBusy(managementTxState)
  function reset(nextMode: typeof mode) {
    revision.current += 1
    setMode(nextMode); setInput(''); setRecipient(null); setError(''); setBusy(false)
    onConfirmationInputChange('')
  }
  return <div className="recipient-settings">
    <div className="manager-summary"><div><h3>Manager</h3><p>Who can edit records.</p><OwnerLabel authority={managedName.manager} viewerAuthority={viewerAuthority} addresses={ownerAddresses} /></div><Button disabled={busy || writing} onClick={() => reset('manager')}>Change manager</Button></div>
    <div className="manager-summary"><div><h3>Transfer</h3><p>Give this name to another wallet.</p></div><Button disabled={busy || writing} onClick={() => reset('transfer')}>Transfer name</Button></div>
    {mode ? <form className="recipient-form" onSubmit={event => {
      event.preventDefault()
      if (!onResolveRecipient || busy || writing) return
      const request = ++revision.current
      setBusy(true); setError(''); setRecipient(null)
      void onResolveRecipient(input).then(result => {
        if (revision.current !== request) return
        setRecipient(result)
        onConfirmationInputChange(mode === 'manager' ? displayName : '')
      }).catch(error => { if (revision.current === request) setError(error.message) }).finally(() => { if (revision.current === request) setBusy(false) })
    }}>
      <TextField id="recipient-address" label={mode === 'transfer' ? 'New owner' : 'New manager'} hint="Dusk address or .dusk name" value={input} onChange={event => { revision.current += 1; setInput(event.target.value); setRecipient(null); setBusy(false); setError(''); onConfirmationInputChange('') }} disabled={busy || writing} />
      {!recipient ? <Button type="submit" disabled={!input.trim() || Boolean(writing)} loading={busy}>Check recipient</Button> : <>
        <p>Resolves to <span className="address-chip"><code>{recipient.address}</code><CopyValue value={recipient.address} label="Recipient Dusk address" /></span></p>
        {mode === 'transfer' ? <><p className="secure-note danger">You will lose ownership and management of {displayName}. The new owner must review its payment records.</p><TextField id="transfer-confirm" label={`Type ${displayName} to confirm`} value={confirmationInput} onChange={event => onConfirmationInputChange(event.target.value)} disabled={busy || writing} /></> : <p>This wallet will be able to edit records. You keep ownership.</p>}
        <Button variant={mode === 'transfer' ? 'destructive' : 'primary'} disabled={!canManageName || busy} loading={Boolean(writing)} onClick={() => { setBusy(true); void onOwnershipUpdate({kind:mode,recipient}).then(saved => { if (saved) reset(null) }).finally(() => setBusy(false)) }}>{mode === 'transfer' ? 'Confirm transfer' : 'Save manager'}</Button>
      </>}
      <Button variant="quiet" disabled={busy || writing} onClick={() => reset(null)}>Cancel</Button>
      {error ? <p role="alert" className="secure-note danger">{error}</p> : null}
    </form> : null}
    <ManagementFeedback error={managementError} txState={managementTxState} />
    <a className="button button-secondary" href={routePath({ view: 'marketplace', sellName: displayName })}>List for sale</a>
  </div>
}
