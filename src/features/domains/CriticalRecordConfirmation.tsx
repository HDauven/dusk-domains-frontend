import { AlertTriangle } from 'lucide-react'
import { TextField } from '../../components/ui/FormControls'

export function CriticalRecordConfirmation({
  criticalRecordConfirmation,
  onCriticalRecordConfirmationChange,
  targetName,
}: {
  criticalRecordConfirmation: string
  onCriticalRecordConfirmationChange: (value: string) => void
  targetName: string
}) {
  return (
    <div className="critical-confirm">
      <div className="public-warning record">
        <AlertTriangle size={17} />
        <span>Confirm the domain before saving critical records.</span>
      </div>
      <TextField
        id="critical-record-confirm"
        hint="Required for address, endpoint, or contract records"
        label="Confirm domain"
        placeholder={targetName}
        value={criticalRecordConfirmation}
        onChange={(event) => onCriticalRecordConfirmationChange(event.target.value)}
      />
    </div>
  )
}
