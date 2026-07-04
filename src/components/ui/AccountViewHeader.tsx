import type { ReactNode } from 'react'

export function AccountViewHeader({
  actions,
  description,
  heading,
  headingId,
}: {
  actions?: ReactNode
  description: ReactNode
  heading: ReactNode
  headingId: string
}) {
  return (
    <div className="my-names-header">
      <div>
        <h1 id={headingId}>{heading}</h1>
        <p>{description}</p>
      </div>
      {actions ? <div className="my-names-actions">{actions}</div> : null}
    </div>
  )
}
