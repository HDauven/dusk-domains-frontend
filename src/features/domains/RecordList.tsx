import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { Info, X } from 'lucide-react'
import {
  type ResolverRecord,
} from '../../names/internal'
import { abbreviate } from '../../utils/format'
import { recordVisibilityLabel } from './domainFormat'
import { isIdentifierRecord, recordLabel } from './recordPresentation'

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
      <EmptyState icon={<Info size={18} />}>No records for {targetName}. Add a record above.</EmptyState>
    )
  }

  return (
    <div className="record-list">
      {resolverRecords.map((record) => {
        const label = recordLabel(record.key)
        return (
          <div className="record-row" key={record.key}>
            <strong>{label}</strong>
            <Badge>{recordVisibilityLabel(record.visibility)}</Badge>
            {isIdentifierRecord(record.key) ? <code>{abbreviate(record.value)}</code> : <span className="record-value">{record.value}</span>}
            <Button variant="destructive"
              aria-label={`Remove ${label}`}
              className="record-remove-button"
              disabled={!canRemoveRecords || recordBusy}
              title={`Remove ${label}`}
              type="button"
              onClick={() => void onClearRecord(record)}
            >
              <X size={15} />
            </Button>
          </div>
        )
      })}
    </div>
  )
}
