import { ArrowRight } from 'lucide-react'
import type { MyDomainsEmptyStateProps } from './types'

export function MyDomainsEmptyState({
  emptyCopy,
  emptyTitle,
  onSearchHome,
}: MyDomainsEmptyStateProps) {
  return (
    <div className="my-names-empty">
      <h2>{emptyTitle}</h2>
      <p>{emptyCopy}</p>
      <button className="primary-button compact" type="button" onClick={onSearchHome}>
        Search names
        <ArrowRight size={19} />
      </button>
    </div>
  )
}
