import { useId, useState } from 'react'

// A record value can be 512 bytes with no break in it. Long values show their first lines, with
// a button to show them in full, so one record can't stretch a list down the page.
const LONG_VALUE = 120

export function RecordValue({ value, code = false }: { value: string; code?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const id = useId()
  const Tag = code ? 'code' : 'p'
  if (value.length <= LONG_VALUE) return <Tag>{value}</Tag>
  return <div className="record-value">
    <Tag id={id} className={expanded ? undefined : 'clamped'}>{value}</Tag>
    <button type="button" className="record-value-toggle" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(!expanded)}>
      {expanded ? 'Show less' : 'Show all'}
    </button>
  </div>
}
