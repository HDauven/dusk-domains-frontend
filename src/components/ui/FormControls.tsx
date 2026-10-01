import { Input, Select } from './Input'
import { useId, type ComponentProps, type ReactNode } from 'react'

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

type FieldShellProps = {
  children: ReactNode
  className?: string
  hint?: ReactNode
  error?: string
  label: ReactNode
  labelFor: string
}

export function FieldShell({ children, className, hint, error, label, labelFor }: FieldShellProps) {
  return (
    <div className={classNames('control-group', className)}>
      <label htmlFor={labelFor}>{label}</label>
      {children}
      {hint ? <div id={`${labelFor}-hint`} className="field-note"><FieldHelp>{hint}</FieldHelp></div> : null}
      {error ? <span id={`${labelFor}-error`} className="field-error">{error}</span> : null}
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

type TextFieldProps = ComponentProps<typeof Input> & {
  groupClassName?: string
  hint?: ReactNode
  error?: string
  label: ReactNode
}

export function TextField({ groupClassName, hint, error, id, label, ...inputProps }: TextFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  return (
    <FieldShell className={groupClassName} hint={hint} error={error} label={label} labelFor={fieldId}>
      <Input {...inputProps} id={fieldId} aria-invalid={error ? true : inputProps['aria-invalid']} aria-describedby={classNames(inputProps['aria-describedby'], Boolean(hint) && `${fieldId}-hint`, error && `${fieldId}-error`) || undefined} />
    </FieldShell>
  )
}

type SelectFieldProps = ComponentProps<typeof Select> & {
  groupClassName?: string
  hint?: ReactNode
  error?: string
  label: ReactNode
}

export function SelectField({ children, groupClassName, hint, error, id, label, ...selectProps }: SelectFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  return (
    <FieldShell className={groupClassName} hint={hint} error={error} label={label} labelFor={fieldId}>
      <Select {...selectProps} id={fieldId} aria-invalid={error ? true : selectProps['aria-invalid']} aria-describedby={classNames(selectProps['aria-describedby'], Boolean(hint) && `${fieldId}-hint`, error && `${fieldId}-error`) || undefined}>
        {children}
      </Select>
    </FieldShell>
  )
}
