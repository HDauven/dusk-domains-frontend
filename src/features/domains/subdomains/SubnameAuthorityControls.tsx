import { useState } from 'react'
import { Input } from '../../../components/ui/Input'
import { Button } from '../../../components/ui/Button'

export function SubnameAuthorityControls({ name, onReassign, onTakeBack, onRemove }: {
  name: string
  onReassign: (owner: string, manager: string) => Promise<void>
  onTakeBack: () => Promise<void>
  onRemove: () => Promise<void>
}) {
  const [mode, setMode] = useState<'reassign' | 'remove' | null>(null)
  const [owner, setOwner] = useState('')
  const [manager, setManager] = useState('')
  const [busy, setBusy] = useState(false)
  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    try { await action(); setMode(null) } finally { setBusy(false) }
  }
  return <div className="subname-actions">
    <p>Taking back or reassigning a subname always clears its records and primary name.</p>
    <Button disabled={busy} onClick={() => { setMode('reassign'); setOwner(''); setManager('') }}>Reassign</Button>
    <Button disabled={busy} onClick={() => void run(onTakeBack)}>Take back</Button>
    <Button disabled={busy} onClick={() => setMode('remove')}>Remove</Button>
    {mode === 'reassign' ? <form onSubmit={event => { event.preventDefault(); void run(() => onReassign(owner, manager || owner)) }}>
      <label>New owner<Input required value={owner} onChange={event => setOwner(event.target.value)} placeholder="Dusk address, .dusk name or contract:0x…" /></label>
      <label>New manager<Input value={manager} onChange={event => setManager(event.target.value)} placeholder="Same as new owner" /></label>
      <Button type="submit" disabled={busy || !owner.trim()}>Save authorities</Button>
      <Button disabled={busy} onClick={() => setMode(null)}>Cancel</Button>
    </form> : null}
    {mode === 'remove' ? <div>
      <p>Remove {name} and all its descendants?</p>
      <Button disabled={busy} onClick={() => void run(onRemove)}>Remove name and descendants</Button>
      <Button disabled={busy} onClick={() => setMode(null)}>Cancel</Button>
    </div> : null}
  </div>
}
