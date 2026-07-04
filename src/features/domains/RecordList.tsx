import { Info, X } from 'lucide-react'
import {
  getRecordDefinition,
  type ResolverRecord,
} from '../../names/internal'
import { abbreviate } from '../../utils/format'
import { recordVisibilityLabel } from './domainFormat'

export function RecordList({
  canRemoveRecords,
  onClearRecord,
  recordBusy,
  resolverRecords,
  targetName,
}: {
  canRemoveRecords: boolean
  onClearRecord: (record: ResolverRecord) => void
  recordBusy: boolean
  resolverRecords: ResolverRecord[]
  targetName: string
}) {
  if (resolverRecords.length === 0) {
    return (
      <div className="activity-empty">
        <Info size={18} />
        <span>No records found for {targetName}.</span>
      </div>
    )
  }

  return (
    <div className="record-list">
      {resolverRecords.map((record) => {
        const label = getRecordDefinition(record.key)?.label ?? record.key
        return (
          <div className="record-row" key={record.key}>
            <strong>{label}</strong>
            <span>{recordVisibilityLabel(record.visibility)}</span>
            <code>{abbreviate(record.value)}</code>
            <button
              aria-label={`Remove ${label}`}
              className="record-remove-button"
              disabled={!canRemoveRecords || recordBusy}
              title={`Remove ${label}`}
              type="button"
              onClick={() => void onClearRecord(record)}
            >
              <X size={15} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
