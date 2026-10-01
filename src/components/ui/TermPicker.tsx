import { Button } from './Button'
import { pluralize } from '../../utils/format'

const termChoices = [1, 2, 3, 5, 10]

// Common terms as one row of choices. A term outside the row, set elsewhere, still shows as chosen.
export function TermPicker({
  disabled = false,
  label,
  max,
  min,
  onChange,
  value,
}: {
  disabled?: boolean
  label: string
  max: number
  min: number
  onChange: (years: number) => void
  value: number
}) {
  const terms = [...new Set([...termChoices, value])]
    .filter((years) => years >= min && years <= max)
    .sort((a, b) => a - b)

  return (
    <div className="term-picker" role="group" aria-label={label}>
      {terms.map((years) => (
        <Button
          key={years}
          className={years === value ? 'active' : ''}
          aria-pressed={years === value}
          disabled={disabled}
          type="button"
          onClick={() => onChange(years)}
        >
          {years} {pluralize(years, 'year')}
        </Button>
      ))}
    </div>
  )
}
