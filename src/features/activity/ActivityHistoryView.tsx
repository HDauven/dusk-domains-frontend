import { Clock } from 'lucide-react'
import {
  activityDescription,
  activityLabel,
  type ActivityEntry,
  type RecentChangeWarning,
} from '../../names/internal'
import { abbreviate } from '../../utils/format'
import { activityWhen } from './activityTime'
import { RecentWarningStack } from './RecentWarnings'

export function ActivityHistoryView({
  activityEntries,
  currentBlockHeight,
  displayName,
  formatActivityTime,
  loading,
  recentWarnings,
}: {
  activityEntries: ActivityEntry[]
  currentBlockHeight: number | null
  displayName: string
  formatActivityTime: (timestamp: string) => string
  loading: boolean
  recentWarnings: RecentChangeWarning[]
}) {
  return (
    <section className="activity-panel" aria-labelledby="activity-heading">
      <div className="management-header">
        <div>
          <h2 id="activity-heading">Activity</h2>
          <p>Every change to {displayName}, newest first.</p>
        </div>
      </div>

      <RecentWarningStack warnings={recentWarnings} />

      {loading ? (
        <div className="activity-empty">
          <Clock size={18} />
          <span>Loading activity</span>
        </div>
      ) : activityEntries.length === 0 ? (
        <div className="activity-empty">
          <Clock size={18} />
          <span>No activity for this name yet.</span>
        </div>
      ) : (
        <ol className="timeline">
          {activityEntries.map((entry) => (
            <li key={entry.id}>
              <div className="timeline-copy">
                <strong>{activityLabel(entry.eventType)}</strong>
                <span>{activityDescription(entry)}</span>
              </div>
              <div className="timeline-meta">
                <time title={entry.blockHeight ? `Block ${entry.blockHeight}` : undefined}>
                  {activityWhen(entry.blockHeight, currentBlockHeight, entry.timestamp, formatActivityTime)}
                </time>
                <code>{abbreviate(entry.actor)}</code>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
