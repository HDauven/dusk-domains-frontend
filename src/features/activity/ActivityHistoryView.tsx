import { Clock } from 'lucide-react'
import {
  activityDescription,
  activityLabel,
  type ActivityEntry,
  type RecentChangeWarning,
} from '../../names/internal'
import { abbreviate } from '../../utils/format'
import { RecentWarningStack } from './RecentWarnings'

export function ActivityHistoryView({
  activityEntries,
  displayName,
  formatActivityTime,
  loading,
  onBack,
  recentWarnings,
}: {
  activityEntries: ActivityEntry[]
  displayName: string
  formatActivityTime: (timestamp: string) => string
  loading: boolean
  onBack: () => void
  recentWarnings: RecentChangeWarning[]
}) {
  return (
    <section className="activity-panel" aria-labelledby="activity-heading">
      <div className="management-header">
        <div>
          <h2 id="activity-heading">Activity history</h2>
          <p>{displayName}</p>
        </div>
        <div className="management-header-actions">
          <span className="management-badge">Activity</span>
          <button className="commit-button" type="button" onClick={onBack}>
            Back to details
          </button>
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
        <ol className="activity-list">
          {activityEntries.map((entry) => (
            <li key={entry.id}>
              <div>
                <strong>{activityLabel(entry.eventType)}</strong>
                <span>{activityDescription(entry)}</span>
              </div>
              <dl>
                <div>
                  <dt>Wallet</dt>
                  <dd>{abbreviate(entry.actor)}</dd>
                </div>
                <div>
                  <dt>Time</dt>
                  <dd>{formatActivityTime(entry.timestamp)}</dd>
                </div>
                <div>
                  <dt>Confirmation</dt>
                  <dd>{entry.blockHeight ?? 'Pending'}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
