import { SelectField } from '../../components/ui/FormControls'
import type { RecordTargetOption } from './recordTypes'

export function RecordTargetSelect({
  activeRecordTarget,
  onRecordTargetChange,
  recordTargetOptions,
}: {
  activeRecordTarget: RecordTargetOption | undefined
  onRecordTargetChange: (node: string) => void
  recordTargetOptions: RecordTargetOption[]
}) {
  return (
    <div className="record-target-bar">
      <SelectField
        id="record-target"
        hint={activeRecordTarget?.label ?? 'Record target'}
        label="Target"
        value={activeRecordTarget?.node ?? ''}
        onChange={(event) => onRecordTargetChange(event.target.value)}
      >
        {recordTargetOptions.map((target) => (
          <option key={target.node} value={target.node}>{target.name}</option>
        ))}
      </SelectField>
    </div>
  )
}
