import { Input } from '../../components/ui/Input'
export function PublicRecordAcknowledgement({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="record-warning">
      <Input
        checked={checked}
        type="checkbox"
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        Records are public.
      </span>
    </label>
  )
}
