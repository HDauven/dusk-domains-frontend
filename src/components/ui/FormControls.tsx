import type { ComponentPropsWithoutRef, ReactNode } from 'react'

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

type FieldShellProps = {
  children: ReactNode
  className?: string
  hint?: ReactNode
  label: ReactNode
  labelFor: string
}

export function FieldShell({ children, className, hint, label, labelFor }: FieldShellProps) {
  return (
    <div className={classNames('control-group', className)}>
      <label htmlFor={labelFor}>{label}</label>
      {children}
      {hint ? <FieldHelp>{hint}</FieldHelp> : null}
    </div>
  )
}

export function FieldHelp({ children }: { children: ReactNode }) {
  if (Array.isArray(children)) {
    return (
      <>
        {children.map((child, index) => (
          // Index is stable for static field helper rows.
          <span key={index}>{child}</span>
        ))}
      </>
    )
  }

  return <span>{children}</span>
}

type TextFieldProps = ComponentPropsWithoutRef<'input'> & {
  groupClassName?: string
  hint?: ReactNode
  label: ReactNode
}

export function TextField({ groupClassName, hint, id, label, ...inputProps }: TextFieldProps) {
  return (
    <FieldShell className={groupClassName} hint={hint} label={label} labelFor={id ?? ''}>
      <input id={id} {...inputProps} />
    </FieldShell>
  )
}

type SelectFieldProps = ComponentPropsWithoutRef<'select'> & {
  groupClassName?: string
  hint?: ReactNode
  label: ReactNode
}

export function SelectField({ children, groupClassName, hint, id, label, ...selectProps }: SelectFieldProps) {
  return (
    <FieldShell className={groupClassName} hint={hint} label={label} labelFor={id ?? ''}>
      <select id={id} {...selectProps}>
        {children}
      </select>
    </FieldShell>
  )
}
