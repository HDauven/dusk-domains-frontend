import { useRef, type ReactNode } from 'react'
import { useSlidingIndicator } from './useSlidingIndicator'

// A row of pressed-state buttons. The chosen button's highlight slides to the next choice; the
// row owns the indicator, so it works wherever the row mounts.
export function ChoiceRow({ className, label, value, children }: {
  className: string
  label: string
  value: string
  children: ReactNode
}) {
  const row = useRef<HTMLDivElement>(null)
  useSlidingIndicator(row, '[aria-pressed="true"]', value)
  return <div ref={row} className={className} role="group" aria-label={label}>{children}</div>
}
