import { TextField } from '../../../components/ui/FormControls'

export function FeeConfigInput({
  help = 'DUSK per year',
  id,
  label,
  onChange,
  value,
}: {
  help?: string
  id: string
  label: string
  onChange: (value: string) => void
  value: string
}) {
  return (
    <TextField
      id={id}
      hint={help}
      inputMode="decimal"
      label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}
