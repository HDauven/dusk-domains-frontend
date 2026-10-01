import { Button, type ButtonProps } from './Button'

export function NameSignature({ name }: { name: string }) {
  const suffix = name.endsWith('.dusk')
  return <span className="name-signature">{suffix ? name.slice(0, -5) : name}{suffix ? <em>.dusk</em> : null}</span>
}

export function NameChip({ name, onClick, className = '', ...props }: Omit<ButtonProps, 'children'> & { name: string }) {
  return onClick ? (
    <Button {...props} className={`name-chip ${className}`} onClick={onClick}><NameSignature name={name} /></Button>
  ) : <span className={`name-chip ${className}`}><NameSignature name={name} /></span>
}
