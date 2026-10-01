import { useLayoutEffect, useRef } from 'react'
import { Button, type ButtonProps } from './Button'
import { registerName } from './nameFitter'

export function NameSignature({ name, fit = false }: { name: string, fit?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const element = ref.current
    // Opt in only when the parent width is independent of the name's text.
    if (element && fit) return registerName(element, name)
  }, [name, fit])
  const suffix = name.endsWith('.dusk')
  return <span className="name-signature" ref={ref}><span className="name-signature-label">{suffix ? name.slice(0, -5) : name}</span>{suffix ? <><wbr /><em>.dusk</em></> : null}</span>
}

export function NameChip({ name, onClick, className = '', ...props }: Omit<ButtonProps, 'children'> & { name: string }) {
  return onClick ? (
    <Button {...props} aria-label={props['aria-label'] ?? name} className={`name-chip ${className}`} onClick={onClick}><NameSignature name={name} /></Button>
  ) : <span className={`name-chip ${className}`}><NameSignature name={name} /></span>
}
