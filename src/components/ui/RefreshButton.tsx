import { RefreshCw } from 'lucide-react'

export function RefreshButton({
  disabled = false,
  loading = false,
  onRefresh,
}: {
  disabled?: boolean
  loading?: boolean
  onRefresh: () => void
}) {
  return (
    <button className="commit-button refresh-button" disabled={disabled || loading} type="button" onClick={() => void onRefresh()}>
      <RefreshCw size={15} className={loading ? 'spin' : undefined} aria-hidden="true" />
      {loading ? 'Refreshing' : 'Refresh'}
    </button>
  )
}
