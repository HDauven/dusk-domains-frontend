import { useRef, type ReactNode } from 'react'
import { Button } from './Button'
import { useSlidingIndicator } from './useSlidingIndicator'

export function Tabs<T extends string>({ id, label, items, value, onChange, className = '' }: {
  id: string
  label: string
  items: Array<{ id: T, label: string, disabled?: boolean, loading?: boolean }>
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  const focusId = items.find((item) => item.id === value && !item.disabled && !item.loading)?.id
    ?? items.find((item) => !item.disabled && !item.loading)?.id
  const list = useRef<HTMLDivElement>(null)
  useSlidingIndicator(list, '[role="tab"][aria-selected="true"]', value)
  return (
    <div ref={list} className={`tabs ${className}`} role="tablist" aria-label={label} onKeyDown={(event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
      const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
      const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
      if (current < 0) return
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
        : (current + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length
      event.preventDefault()
      buttons[next].focus()
      buttons[next].click()
    }}>
      {items.map((item) => (
        <Button key={item.id} variant="quiet" role="tab" id={`${id}-${item.id}`} aria-controls={`${id}-panel-${item.id}`}
          aria-selected={value === item.id} tabIndex={focusId === item.id ? 0 : -1} disabled={item.disabled} loading={item.loading}
          onClick={() => onChange(item.id)}>{item.label}</Button>
      ))}
    </div>
  )
}

export function TabPanel({ id, value, children }: { id: string, value: string, children: ReactNode }) {
  return <div role="tabpanel" id={`${id}-panel-${value}`} aria-labelledby={`${id}-${value}`} tabIndex={0}>{children}</div>
}
