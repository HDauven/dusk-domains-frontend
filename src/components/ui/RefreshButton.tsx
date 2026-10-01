import { Button } from './Button'
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
    <Button className="refresh-button" disabled={disabled} loading={loading} type="button" onClick={() => void onRefresh()}>
      <RefreshCw size={15}  aria-hidden="true" />
      {loading ? 'Refreshing' : 'Refresh'}
    </Button>
  )
}
