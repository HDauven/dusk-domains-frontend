import { useState, type FormEvent } from 'react'
import { Panel } from '../../components/ui/Panel'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { type CoreRecordMutationInput, type DuskDomainTxState, type ResolverRecord, type ResolverRecordKey } from '../../names/internal'
import { RecordDraftEditor } from './RecordDraftEditor'
import { ManagementFeedback } from './ManagementFeedback'
import { recordLabel, isIdentifierRecord } from './recordPresentation'
import { RecordKeyLabel } from './RecordKeyLabel'
import { RecordValue } from './RecordValue'

// Changes are staged here and saved together: one wallet approval writes them all. Staged
// changes belong to the name, not this panel, so they stay when the panel closes.
export function RecordsView({ displayName, editableRecordKeys, resolverRecords, actions, draft, wallet }: {
  displayName: string
  editableRecordKeys: readonly ResolverRecordKey[]
  resolverRecords: ResolverRecord[]
  actions: {
    canRemoveRecords: boolean
    canSaveRecords: boolean
    error: string
    onSaveRecords: () => Promise<boolean | undefined>
    recordBusy: boolean
    txState: DuskDomainTxState | null
  }
  draft: {
    criticalRecordChange: boolean
    recordDraftMutations: CoreRecordMutationInput[]
    onDiscardDrafts: () => void
    /** Forget one record's staged change; null only stops a pending wallet address request. */
    onDiscardDraft: (key: ResolverRecordKey | null) => void
    onDraftValueChange: (key: ResolverRecordKey, value: string) => void
    recordDraftErrors: string[]
    /** Staged values that can't be saved as they are, with why. */
    recordDraftInvalid?: { key: string; error: string }[]
    recordDraftValues: Partial<Record<ResolverRecordKey, string>>
  }
  wallet: {
    onUseWalletPublicAddress: () => void
    onUseWalletShieldedAddress: () => Promise<void>
    walletAddressAvailable: boolean
  }
}) {
  const { canRemoveRecords, canSaveRecords, error, onSaveRecords, recordBusy, txState } = actions
  const { criticalRecordChange, recordDraftMutations, onDiscardDrafts, onDiscardDraft, onDraftValueChange, recordDraftErrors, recordDraftInvalid, recordDraftValues } = draft
  const { onUseWalletPublicAddress, onUseWalletShieldedAddress, walletAddressAvailable } = wallet
  const [editing, setEditing] = useState<ResolverRecordKey | null>(null)
  const [adding, setAdding] = useState(false)
  // The change already staged for the record being edited, which Cancel puts back.
  const [stagedBefore, setStagedBefore] = useState<{ key: ResolverRecordKey, value: string } | null>(null)
  const staged = new Map(recordDraftMutations.map(mutation => [mutation.key, mutation]))
  const invalid = new Map((recordDraftInvalid ?? []).map(item => [item.key, item.error]))
  const pending = (key: string) => staged.has(key) || invalid.has(key)
  const saved = (key: string) => resolverRecords.some(record => record.key === key)
  const count = recordDraftMutations.length
  const saveLabel = count > 1 ? `Save ${count} changes` : 'Save record'
  // New records staged so far, including values that can't be saved yet. One being edited keeps its
  // place and shows its editor there, whatever its value.
  const additions = editableRecordKeys.filter(key => !saved(key) && (key === editing ? !adding : pending(key)))
  const available = editableRecordKeys.filter(key => !saved(key) && (key === editing || !pending(key)))

  function close() { setEditing(null); setAdding(false); setStagedBefore(null) }
  function save(event?: FormEvent) {
    event?.preventDefault()
    if (canSaveRecords) void onSaveRecords().then(saved => { if (saved) close() })
  }
  function cancel() {
    if (editing && stagedBefore?.key === editing) onDraftValueChange(editing, stagedBefore.value)
    else onDiscardDraft(editing)
    close()
  }
  // Keep this change staged and close the editor, so another record can be changed before saving.
  function keep() { onDiscardDraft(null); close() }
  function startEditing(key: ResolverRecordKey) {
    setAdding(false)
    setEditing(key)
    setStagedBefore(pending(key) ? { key, value: recordDraftValues[key] ?? '' } : null)
  }
  function chooseType(key: ResolverRecordKey) { onDiscardDraft(editing); setEditing(key) }

  const review = count ? <dl className="record-draft-review" aria-label="Record changes to save">{recordDraftMutations.map(mutation => <div key={mutation.key}>
    <dt><RecordKeyLabel recordKey={mutation.key as ResolverRecordKey} /></dt><dd>{mutation.action === 'clear' ? 'Remove' : <RecordValue value={mutation.value} code />}</dd>
  </div>)}</dl> : null
  const notes = <>
    {criticalRecordChange ? <p className="secure-note">Payments will use this address. Check it before saving.</p> : null}
    {recordDraftErrors[0] ? <p role="alert" className="secure-note danger">{recordDraftErrors[0]}</p> : null}
  </>
  const editingChanged = Boolean(editing && staged.has(editing))
  const editor = editing ? <form className="inline-record-editor" onSubmit={save}>
    <RecordDraftEditor editableRecordKeys={[editing]} recordDraftValues={recordDraftValues} onDraftValueChange={onDraftValueChange} onUseWalletPublicAddress={onUseWalletPublicAddress} onUseWalletShieldedAddress={onUseWalletShieldedAddress} walletAddressAvailable={walletAddressAvailable} />
    {review}
    {notes}
    <div className="record-actions">
      <Button variant="primary" type="submit" disabled={!canSaveRecords} loading={recordBusy}>{saveLabel}</Button>
      <Button disabled={recordBusy || !editingChanged || recordDraftErrors.length > 0} onClick={keep}>Add another change</Button>
      <Button disabled={recordBusy} onClick={cancel}>Cancel</Button>
    </div>
  </form> : null

  const stagedNote = (key: string) => {
    const change = staged.get(key), error = invalid.get(key)
    if (key === editing || !(change || error)) return null
    if (error) return <p className="record-staged invalid">Can't be saved: {error}</p>
    return <p className="record-staged">{change?.action === 'clear' ? 'Will be removed when you save.' : 'Not saved yet.'}</p>
  }
  // A staged value: as it will be saved, or as typed when it can't be.
  const stagedValue = (key: ResolverRecordKey) => {
    const change = staged.get(key)
    return change?.action === 'set' ? change.value : recordDraftValues[key] ?? ''
  }
  const undo = (key: ResolverRecordKey) => pending(key) && key !== editing
    ? <Button variant="quiet" disabled={recordBusy} onClick={() => onDiscardDraft(key)} aria-label={`Undo ${recordLabel(key)}`}>Undo</Button> : null

  return <Panel className="records-panel" aria-labelledby="records-heading">
    <div className="management-header"><div><h2 id="records-heading">Records</h2><p>Public information for {displayName}. Change several records, then save them together.</p></div>
      {!adding && !editing && available.length ? <Button disabled={!canRemoveRecords} onClick={() => { setAdding(true); setEditing(available[0]) }}>Add record</Button> : null}
    </div>
    <div className="record-list">
      {resolverRecords.map(record => {
        const change = staged.get(record.key), status = change?.action ?? (invalid.has(record.key) ? 'invalid' : null)
        const shown = (status === 'set' || status === 'invalid') && record.key !== editing ? stagedValue(record.key) : record.value
        return <div className={`record-entry${status && record.key !== editing ? ` staged ${status}` : ''}`} key={record.key}>
          {!adding && editing === record.key ? editor : <>
            <div><strong><RecordKeyLabel recordKey={record.key} /></strong><RecordValue value={shown} code={isIdentifierRecord(record.key)} />{stagedNote(record.key)}</div>
            <div className="record-actions">
              {editableRecordKeys.includes(record.key) ? <Button disabled={!canRemoveRecords || Boolean(editing)} onClick={() => startEditing(record.key)} aria-label={`Edit ${recordLabel(record.key)}`}>Edit</Button> : <span className="muted">Read only</span>}
              {undo(record.key) ?? <Button variant="quiet" disabled={!canRemoveRecords || recordBusy || Boolean(editing)} onClick={() => onDraftValueChange(record.key, '')} aria-label={`Remove ${recordLabel(record.key)}`}>Remove</Button>}
            </div>
          </>}
        </div>
      })}
      {additions.map(key => <div className={`record-entry${key === editing ? '' : ` staged ${invalid.has(key) ? 'invalid' : 'set'}`}`} key={key}>
        {key === editing ? editor : <>
          <div><strong><RecordKeyLabel recordKey={key} /></strong><RecordValue value={stagedValue(key)} code={isIdentifierRecord(key)} />{stagedNote(key)}</div>
          <div className="record-actions">
            <Button disabled={!canRemoveRecords || Boolean(editing)} onClick={() => startEditing(key)} aria-label={`Edit ${recordLabel(key)}`}>Edit</Button>
            {undo(key)}
          </div>
        </>}
      </div>)}
    </div>
    {adding ? <div className="record-add"><label htmlFor="record-type">Record type</label><select id="record-type" value={editing ?? ''} onChange={event => chooseType(event.target.value as ResolverRecordKey)}>{available.map(key => <option key={key} value={key}>{recordLabel(key)}</option>)}</select>{editor}</div> : null}
    {!resolverRecords.length && !additions.length && !adding ? <EmptyState>No records yet. Add a record to this name.</EmptyState> : null}
    {count && !editing ? <section className="record-pending" aria-label="Unsaved record changes">
      <strong>{count === 1 ? '1 change to save' : `${count} changes to save`}</strong>
      {review}
      <p className="field-note">One wallet approval saves them all. Each save holds up to 8 changes.</p>
      {notes}
      <div className="record-actions">
        <Button variant="primary" disabled={!canSaveRecords} loading={recordBusy} onClick={() => save()}>{count > 1 ? saveLabel : 'Save change'}</Button>
        <Button disabled={recordBusy} onClick={onDiscardDrafts}>Discard changes</Button>
      </div>
    </section> : null}
    <ManagementFeedback error={error} txState={txState} />
  </Panel>
}
