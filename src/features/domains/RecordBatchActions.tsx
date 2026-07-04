export function RecordBatchActions({
  canSaveRecords,
  onSaveRecords,
  recordDraftMutationCount,
}: {
  canSaveRecords: boolean
  onSaveRecords: () => void
  recordDraftMutationCount: number
}) {
  return (
    <div className="record-batch-actions">
      <div className="record-batch-summary">
        <strong>{recordDraftMutationCount}</strong>
        <span>{recordDraftMutationCount === 1 ? 'pending change' : 'pending changes'}</span>
      </div>
      <button
        className="commit-button save-record"
        disabled={!canSaveRecords}
        type="button"
        onClick={() => void onSaveRecords()}
      >
        Save records
      </button>
    </div>
  )
}
