import { useId, useState } from 'react'
import { abbreviate } from '../../utils/format'
import { Button } from './Button'
import { CopyValue } from './CopyValue'

export function AddressChip({ value, label = 'address', disabled = false, loading = false }: { value: string, label?: string, disabled?: boolean, loading?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const id = useId()
  return <span className="address-chip" aria-busy={loading || undefined}>
    <Button variant="quiet" aria-expanded={expanded} aria-controls={id} aria-label={`${expanded ? 'Hide' : 'Show'} full ${label}`} disabled={disabled || loading}
      onClick={() => setExpanded(!expanded)}><code title={value}>{abbreviate(value)}</code></Button>
    <CopyValue value={value} label={label} disabled={disabled || loading} />
    <code id={id} className="address-chip-full" hidden={!expanded}>{value}</code>
  </span>
}
