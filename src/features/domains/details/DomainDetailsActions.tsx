export function DomainDetailsActions({
  onActivity,
  onManageRecords,
  onPrimary,
  onSettings,
  onSubdomains,
}: {
  onActivity: () => void
  onManageRecords: () => void
  onPrimary: () => void
  onSettings: () => void
  onSubdomains: () => void
}) {
  return (
    <div className="details-actions">
      <button className="commit-button save-record" type="button" onClick={onManageRecords}>
        Manage records
      </button>
      <button className="commit-button save-record" type="button" onClick={onSubdomains}>
        Subdomains
      </button>
      <button className="commit-button save-record" type="button" onClick={onPrimary}>
        Primary domain
      </button>
      <button className="commit-button save-record" type="button" onClick={onSettings}>
        Settings
      </button>
      <button className="commit-button" type="button" onClick={onActivity}>
        Activity
      </button>
    </div>
  )
}
