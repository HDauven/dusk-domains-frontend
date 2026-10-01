import { EmptyState } from '../../components/ui/EmptyState'
import { Panel } from '../../components/ui/Panel'
import { Button } from '../../components/ui/Button'
import { Clock } from 'lucide-react'
import type { ActivityEntry, RecentChangeWarning } from '../../names/internal'
import { activityActor, activityDetail, activityTitle } from './activityCopy'
import { activityWhen } from './activityTime'
import { RecentWarningStack } from './RecentWarnings'

export function ActivityHistoryView({
  activityEntries,
  hasMore,
  onLoadMore,
  currentBlockHeight,
  displayName,
  formatActivityTime,
  loading,
  recentWarnings,
  viewerAuthority,
}: {
  hasMore?: boolean
  onLoadMore?: () => void
  activityEntries: ActivityEntry[]
  currentBlockHeight: number | null
  displayName: string
  formatActivityTime: (timestamp: string) => string
  loading: boolean
  recentWarnings: RecentChangeWarning[]
  viewerAuthority: string
}) {
  return (
    <Panel className="activity-panel" aria-labelledby="activity-heading">
      <div className="management-header">
        <div>
          <h2 id="activity-heading">Activity</h2>
          <p>Every change to {displayName}, newest first.</p>
        </div>
      </div>

      <RecentWarningStack warnings={recentWarnings} />

      {loading ? (
        <EmptyState loading icon={<Clock size={18} />}>Loading activity</EmptyState>
      ) : activityEntries.length === 0 ? (
        <EmptyState icon={<Clock size={18} />}>No activity recorded for this name.</EmptyState>
      ) : (
        <ol className="timeline">
          {activityEntries.map((entry) => (
            <li key={entry.id}>
              <div className="timeline-copy">
                <strong>{activityTitle(entry)}</strong>
                <span>{activityDetail(entry, viewerAuthority)}</span>
              </div>
              <div className="timeline-meta">
                <time title={entry.blockHeight ? `Block ${entry.blockHeight}` : undefined}>
                  {activityWhen(entry.blockHeight, currentBlockHeight, entry.timestamp, formatActivityTime)}
                </time>
                <code>{activityActor(entry.actor, viewerAuthority)}</code>
              </div>
            </li>
          ))}
        </ol>
      )}
      {hasMore ? <Button variant="quiet" disabled={loading} type="button" onClick={onLoadMore}>Load more activity</Button> : null}
    </Panel>
  )
}
