import type { ReactNode } from 'react'

export type ClaimReviewRow = {
  asCode?: boolean
  label: ReactNode
  value: ReactNode
}

export function ClaimReview({
  ariaLabel,
  rows,
}: {
  ariaLabel: string
  rows: ClaimReviewRow[]
}) {
  return (
    <div className="claim-review" aria-label={ariaLabel}>
      {rows.map((row, index) => (
        <p key={`${String(row.label)}:${index}`}>
          <span>{row.label}</span>
          {row.asCode ? <code>{row.value}</code> : <strong>{row.value}</strong>}
        </p>
      ))}
    </div>
  )
}
