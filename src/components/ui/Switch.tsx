import type { ComponentProps } from 'react'

type SwitchProps = Omit<ComponentProps<'button'>, 'children' | 'onChange'> & {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

export function Switch({ checked, onCheckedChange, className = '', ...props }: SwitchProps) {
  return (
    <button {...props} type="button" role="switch" aria-checked={checked} className={`switch ${className}`} onClick={() => onCheckedChange(!checked)}>
      <span className="switch-track" aria-hidden="true"><span className="switch-thumb" /></span>
    </button>
  )
}
