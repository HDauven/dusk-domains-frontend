import type { ResolverRecordKey } from '../../names/internal'
import { isKnownRecordKey, recordLabel, visibleRecordKey } from './recordPresentation'

/** A record's label: its name for a known key; otherwise its exact key, marked as a custom record. */
export function RecordKeyLabel({ recordKey }: { recordKey: ResolverRecordKey }) {
  if (isKnownRecordKey(recordKey)) return recordLabel(recordKey)
  return <span className="record-key custom"><code className="record-key-raw">{visibleRecordKey(recordKey)}</code><small className="record-key-mark">Custom record</small></span>
}
