import { Clock3 } from 'lucide-react'
import type { RecentChangeWarning } from '../../names/internal'

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  if (minutes < 60) return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const minuteRemainder = minutes % 60
  return minuteRemainder ? `${hours}h ${minuteRemainder}m` : `${hours}h`
}

function recentWarningTitle(warning: RecentChangeWarning) {
  if (warning.code === 'recent_resolver_change') return 'Record source updated'
  if (warning.code === 'recent_primary_name_change') return 'Primary domain updated'
  return 'Record updated'
}

export function RecentWarningStack({ warnings }: { warnings: RecentChangeWarning[] }) {
  if (warnings.length === 0) return null

  return (
    <div className="recent-warning-stack" aria-label="Recent domain activity">
      {warnings.slice(0, 3).map((warning) => (
        <div className="recent-warning" key={`${warning.code}:${warning.node}:${warning.timestamp}:${warning.target ?? ''}`}>
          <Clock3 size={17} />
          <div>
            <strong>{recentWarningTitle(warning)}</strong>
            <span>{warning.message}</span>
            <code>{formatDuration(warning.ageSeconds)} ago · {warning.target ?? warning.eventType}</code>
          </div>
        </div>
      ))}
    </div>
  )
}

export function RecentWarningSummary({
  warnings,
  onReview,
}: {
  warnings: RecentChangeWarning[]
  onReview: () => void
}) {
  if (warnings.length === 0) return null

  return (
    <div className="recent-warning-summary">
      <div>
        <strong>
          Recent updates
        </strong>
        <span>
          {warnings.length === 1 ? 'One domain change is' : `${warnings.length} domain changes are`} in the activity log.
        </span>
      </div>
      <button className="commit-button" type="button" onClick={onReview}>
        View activity
      </button>
    </div>
  )
}
