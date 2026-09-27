import { Clock3 } from 'lucide-react'
import type { RecentChangeWarning } from '../../names/internal'
import { recentTargetLabel, recordLabel } from './activityCopy'
import { relativeAge } from './activityTime'

function warningRecord(warning: RecentChangeWarning) {
  return warning.target ? recordLabel(warning.target) : null
}

// The SDK's messages name raw record keys; say the same thing with the record's label.
function recentWarningMessage(warning: RecentChangeWarning) {
  if (warning.code === 'recent_primary_name_change') return 'Apps check that it matches the address before showing it.'
  if (warning.code === 'recent_resolver_change') return 'Records now come from a different source. Check them before sending funds.'
  return `If you didn't change ${warningRecord(warning) ?? 'this record'}, check it before sending funds.`
}

function recentWarningTitle(warning: RecentChangeWarning) {
  if (warning.code === 'recent_resolver_change') return 'Record source changed'
  if (warning.code === 'recent_primary_name_change') return 'Primary name changed'
  return `${warningRecord(warning) ?? 'A record'} changed`
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
            <span>{recentWarningMessage(warning)}</span>
            <code>{relativeAge(warning.ageSeconds)} · {recentTargetLabel(warning.target, warning.eventType)}</code>
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
