import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { TextField } from '../../../components/ui/FormControls'

export function SubnameAuthorityControls({ name, onReassign, onTakeBack, onRemove }: {
  name: string
  onReassign: (owner: string, manager: string) => Promise<void>
  onTakeBack: () => Promise<void>
  onRemove: () => Promise<void>
}) {
  const [mode, setMode] = useState<'reassign' | 'take-back' | 'remove' | null>(null)
  const [owner, setOwner] = useState('')
  const [manager, setManager] = useState('')
  const [busy, setBusy] = useState(false)
  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    try { await action(); setMode(null) } finally { setBusy(false) }
  }
  const cancel = <Button disabled={busy} onClick={() => setMode(null)}>Cancel</Button>
  return <div className="subname-actions">
    <p>Taking back or reassigning a subname always clears its records and primary name.</p>
    <div className="form-actions">
      <Button disabled={busy} onClick={() => { setMode('reassign'); setOwner(''); setManager('') }}>Reassign</Button>
      <Button disabled={busy} onClick={() => setMode('take-back')}>Take back</Button>
      <Button disabled={busy} onClick={() => setMode('remove')}>Remove</Button>
    </div>
    {mode === 'reassign' ? <form className="subname-reassign" onSubmit={event => { event.preventDefault(); void run(() => onReassign(owner, manager || owner)) }}>
      <div className="field-row">
        <TextField label="New owner" hint="Dusk address, .dusk name or contract:0x…" required value={owner} onChange={event => setOwner(event.target.value)} />
        <TextField label="New manager" placeholder="Same as new owner" value={manager} onChange={event => setManager(event.target.value)} />
      </div>
      <div className="form-actions">
        <Button type="submit" disabled={busy || !owner.trim()}>Save authorities</Button>
        {cancel}
      </div>
    </form> : null}
    {mode === 'take-back' ? <div className="subname-confirm">
      <p>Take back {name}? Its records and primary name are cleared, and its current owner and manager lose it. You become its owner and manager.</p>
      <div className="form-actions">
        <Button disabled={busy} onClick={() => void run(onTakeBack)}>Take back name</Button>
        {cancel}
      </div>
    </div> : null}
    {mode === 'remove' ? <div className="subname-confirm">
      <p>Remove {name} and all its descendants?</p>
      <div className="form-actions">
        <Button disabled={busy} onClick={() => void run(onRemove)}>Remove name and descendants</Button>
        {cancel}
      </div>
    </div> : null}
  </div>
}
