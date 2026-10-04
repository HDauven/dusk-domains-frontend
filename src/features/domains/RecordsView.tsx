import { useEffect, useEffectEvent, useState } from 'react'
import { Panel } from '../../components/ui/Panel'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { type CoreRecordMutationInput, type DuskDomainTxState, type ResolverRecord, type ResolverRecordKey } from '../../names/internal'
import { RecordDraftEditor } from './RecordDraftEditor'
import { ManagementFeedback } from './ManagementFeedback'
import { recordLabel, isIdentifierRecord } from './recordPresentation'

export function RecordsView({ displayName, editableRecordKeys, resolverRecords, actions, draft, wallet }: {
  displayName: string
  editableRecordKeys: readonly ResolverRecordKey[]
  resolverRecords: ResolverRecord[]
  actions: {
    canRemoveRecords: boolean
    canSaveRecords: boolean
    error: string
    onClearRecord: (record: ResolverRecord) => void
    onSaveRecords: () => Promise<boolean | undefined>
    recordBusy: boolean
    txState: DuskDomainTxState | null
  }
  draft: {
    criticalRecordChange: boolean
    recordDraftMutations: CoreRecordMutationInput[]
    onDiscardDrafts: () => void
    onDraftValueChange: (key: ResolverRecordKey, value: string) => void
    recordDraftErrors: string[]
    recordDraftValues: Partial<Record<ResolverRecordKey, string>>
  }
  wallet: {
    onUseWalletPublicAddress: () => void
    onUseWalletShieldedAddress: () => Promise<void>
    walletAddressAvailable: boolean
  }
}) {
  const {
    canRemoveRecords,
    canSaveRecords,
    error,
    onClearRecord,
    onSaveRecords,
    recordBusy,
    txState,
  } = actions
  const {
    criticalRecordChange,
    recordDraftMutations,
    onDiscardDrafts,
    onDraftValueChange,
    recordDraftErrors,
    recordDraftValues,
  } = draft
  const {
    onUseWalletPublicAddress,
    onUseWalletShieldedAddress,
    walletAddressAvailable,
  } = wallet
  const discardOnUnmount = useEffectEvent(onDiscardDrafts)
  useEffect(() => () => discardOnUnmount(), [])
  const [editing, setEditing] = useState<ResolverRecordKey | null>(null)
  const [adding, setAdding] = useState(false)
  const available = editableRecordKeys.filter(key => !resolverRecords.some(record => record.key === key))
  function edit(key: ResolverRecordKey | null) { onDiscardDrafts(); setEditing(key) }
  const editor = editing ? <form className="inline-record-editor" onSubmit={event => {
    event.preventDefault()
    if (canSaveRecords) void onSaveRecords().then(saved => { if (saved) { setEditing(null); setAdding(false) } })
  }}>
    <RecordDraftEditor editableRecordKeys={[editing]} recordDraftValues={recordDraftValues} onDraftValueChange={onDraftValueChange} onUseWalletPublicAddress={onUseWalletPublicAddress} onUseWalletShieldedAddress={onUseWalletShieldedAddress} walletAddressAvailable={walletAddressAvailable} />
    {criticalRecordChange ? <p className="secure-note">Payments will use this address. Check it before saving.</p> : null}
    {recordDraftMutations?.length ? <dl className="record-draft-review" aria-label="Record changes to save">{recordDraftMutations.map(mutation => <div key={mutation.key}>
      <dt>{recordLabel(mutation.key as ResolverRecordKey)}</dt><dd>{mutation.action === 'clear' ? 'Remove record' : <code>{mutation.value}</code>}</dd>
    </div>)}</dl> : null}
    {recordDraftErrors[0] ? <p role="alert" className="secure-note danger">{recordDraftErrors[0]}</p> : null}
    <div className="record-actions"><Button variant="primary" type="submit" disabled={!canSaveRecords} loading={recordBusy}>Save record</Button><Button disabled={recordBusy} onClick={() => { edit(null); setAdding(false) }}>Cancel</Button></div>
  </form> : null
  return <Panel className="records-panel" aria-labelledby="records-heading">
    <div className="management-header"><div><h2 id="records-heading">Records</h2><p>Public information for {displayName}.</p></div>
      {!adding && !editing && available.length ? <Button disabled={!canRemoveRecords} onClick={() => { setAdding(true); edit(available[0]) }}>Add record</Button> : null}
    </div>
    <div className="record-list">
      {resolverRecords.map(record => <div className="record-entry" key={record.key}>
        {!adding && editing === record.key ? editor : <>
          <div><strong>{recordLabel(record.key)}</strong>{isIdentifierRecord(record.key) ? <code>{record.value}</code> : <p>{record.value}</p>}</div>
          <div className="record-actions">{editableRecordKeys.includes(record.key) ? <Button disabled={!canRemoveRecords || Boolean(editing)} onClick={() => { setAdding(false); edit(record.key) }} aria-label={`Edit ${recordLabel(record.key)}`}>Edit</Button> : <span className="muted">Read only</span>}<Button variant="quiet" disabled={!canRemoveRecords || recordBusy || Boolean(editing)} onClick={() => onClearRecord(record)} aria-label={`Remove ${recordLabel(record.key)}`}>Remove</Button></div>
        </>}
      </div>)}
    </div>
    {adding ? <div className="record-add"><label htmlFor="record-type">Record type</label><select id="record-type" value={editing ?? ''} onChange={event => edit(event.target.value as ResolverRecordKey)}>{available.map(key => <option key={key} value={key}>{recordLabel(key)}</option>)}</select>{editor}</div> : null}
    {!resolverRecords.length && !adding ? <EmptyState>No records yet. Add a record to this name.</EmptyState> : null}
    <ManagementFeedback error={error} txState={txState} />
  </Panel>
}
