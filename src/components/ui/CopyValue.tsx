import { Check, Copy } from 'lucide-react'
import { useRef, useState, useEffect } from 'react'
import { Button } from './Button'
import { Toast } from './Toast'

export function CopyValue({ value, label = 'address', disabled = false }: { value: string, label?: string, disabled?: boolean }) {
  return <CopyAction key={value} value={value} label={label} disabled={disabled} />
}

function CopyAction({ value, label, disabled }: { value: string, label: string, disabled: boolean }) {
  const [state, setState] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle')
  const mounted = useRef(false)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  return <span className="copy-control">
    <Button className="copy-value" disabled={disabled || !value} loading={state === 'copying'} aria-label={`Copy ${label}`} onClick={async () => {
      setState('copying')
      try {
        await navigator.clipboard.writeText(value)
        if (mounted.current) setState('copied')
      } catch {
        if (mounted.current) setState('error')
      }
    }}>
      <span className="copy-icon" data-copied={state === 'copied' || undefined} aria-hidden="true"><Copy size={15} /><Check size={15} /></span>
      <span className="copy-label" key={state}>{state === 'copied' ? 'Copied' : state === 'copying' ? 'Copying' : 'Copy'}</span>
    </Button>
    <Toast message={state === 'copied' ? `${label} copied.` : state === 'error' ? `Could not copy ${label}. Select the full value and copy it.` : ''}
      tone={state === 'error' ? 'danger' : 'success'} onDismiss={() => setState('idle')} />
  </span>
}
