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
    <button
      className="commit-button save-record"
      disabled={disabled}
      type="button"
      onClick={() => void onRefresh()}
    >
      {loading ? 'Refreshing...' : 'Refresh'}
    </button>
  )
}
