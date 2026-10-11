import { useState } from 'react'
import { activityActions, activityPartyLabel, paymentWarnings, type ActivityAction, type ActivityContext } from './activityActions'
import { EmptyState } from '../../components/ui/EmptyState'
import { Panel } from '../../components/ui/Panel'
import { Button } from '../../components/ui/Button'
import { CopyValue } from '../../components/ui/CopyValue'
import { Clock, Download, ExternalLink } from 'lucide-react'
import { userFacingErrorMessage, type ActivityEntry, type RecentChangeWarning } from '../../names/internal'
import { explorerTransactionUrl } from '../../app/explorer'
import { abbreviate } from '../../utils/format'
import { activityEventDetail } from './activityCopy'
import { activityCsv, downloadCsv } from './activityCsv'
import { activityWhen, formatActivityDate } from './activityTime'
import { RecentWarningStack } from './RecentWarnings'

export function ActivityHistoryView({
  ownerAddresses = [],
  activityEntries,
  hasMore,
  onLoadMore,
  currentBlockHeight,
  nowSeconds,
  displayName,
  explorerUrl,
  formatActivityTime,
  holders,
  loadFullHistory,
  loading,
  marketplaceContractId,
  recentWarnings,
  subnames,
  viewerAuthority,
}: {
  ownerAddresses?: string[]
  hasMore?: boolean
  onLoadMore?: () => void
  activityEntries: ActivityEntry[]
  currentBlockHeight: number | null
  nowSeconds?: number
  displayName: string
  /** Block explorer origin for transaction links; links are hidden without one. */
  explorerUrl?: string | null
  formatActivityTime: (timestamp: string) => string
  /** The name's current owner and manager. */
  holders?: ActivityContext['holders']
  /** Reads every page of this name's history, for the CSV download. */
  loadFullHistory?: () => Promise<ActivityEntry[]>
  loading: boolean
  marketplaceContractId?: string | null
  recentWarnings: RecentChangeWarning[]
  subnames?: ActivityContext['subnames']
  viewerAuthority: string
}) {
  const [download, setDownload] = useState<{ busy: boolean, error: string }>({ busy: false, error: '' })
  const context = { viewerAuthority, addresses: ownerAddresses, currentBlockHeight, nowSeconds, subnames, marketplaceContractId, holders }
  const label = activityPartyLabel(viewerAuthority, ownerAddresses)
  const actions = activityActions(activityEntries, { ...context, partial: hasMore })

  async function downloadHistory() {
    setDownload({ busy: true, error: '' })
    try {
      const entries = loadFullHistory ? await loadFullHistory() : activityEntries
      downloadCsv(`${displayName}-history.csv`, activityCsv(entries, { ...context, explorerUrl }))
      setDownload({ busy: false, error: '' })
    } catch (error) {
      setDownload({ busy: false, error: `Could not download the history. ${userFacingErrorMessage(error)}` })
    }
  }

  return (
    <Panel className="activity-panel" aria-labelledby="activity-heading">
      <div className="management-header">
        <div>
          <h2 id="activity-heading">Activity</h2>
          <p>Every change to {displayName}, newest first. Times are in UTC.</p>
        </div>
        {actions.length ? <Button className="compact" loading={download.busy} onClick={() => void downloadHistory()}>
          <Download size={15} aria-hidden="true" /> Download CSV
        </Button> : null}
      </div>
      {download.error ? <p role="alert" className="field-note warning">{download.error}</p> : null}

      <RecentWarningStack warnings={paymentWarnings(recentWarnings, viewerAuthority, activityEntries)} />

      {loading && actions.length === 0 ? (
        <EmptyState loading icon={<Clock size={18} />}>Loading activity</EmptyState>
      ) : actions.length === 0 ? (
        <EmptyState icon={<Clock size={18} />}>No activity recorded for this name.</EmptyState>
      ) : (
        <ol className="timeline">
          {actions.map(action => (
            <li key={action.key}>
              <div className="timeline-copy">
                <strong>{action.title}</strong>
                {action.details.length ? <span>{action.details.join(' · ')}</span> : null}
                {action.actor ? <span className="timeline-actor">By {label(action.actor)}</span> : null}
              </div>
              <div className="timeline-meta">
                <ActivityTime action={action} currentBlockHeight={currentBlockHeight} formatActivityTime={formatActivityTime} />
                <TransactionLink explorerUrl={explorerUrl} txId={action.txId} />
                <ActionDetails action={action} viewerAuthority={viewerAuthority} ownerAddresses={ownerAddresses} />
              </div>
            </li>
          ))}
        </ol>
      )}
      {hasMore ? <Button variant="quiet" disabled={loading} type="button" onClick={onLoadMore}>Load more activity</Button> : null}
    </Panel>
  )
}

/** The exact UTC time with the age as a hint; compact shows the age and keeps the exact time as a tooltip. */
export function ActivityTime({ action, compact = false, currentBlockHeight, formatActivityTime }: {
  action: Pick<ActivityAction, 'timestamp' | 'blockHeight'>
  compact?: boolean
  currentBlockHeight: number | null
  formatActivityTime: (timestamp: string) => string
}) {
  const exact = formatActivityDate(action.timestamp)
  const relative = activityWhen(action.blockHeight, currentBlockHeight, action.timestamp, formatActivityTime)
  if (!exact) return <time>{relative}</time>
  if (compact) return <time dateTime={new Date(action.timestamp).toISOString()} title={exact}>{relative}</time>
  return <span className="timeline-when">
    <time dateTime={new Date(action.timestamp).toISOString()}>{exact}</time>
    {relative !== exact.replace(' UTC', '') ? <small>{relative}</small> : null}
  </span>
}

function TransactionLink({ explorerUrl, txId }: { explorerUrl?: string | null, txId?: string }) {
  if (!txId) return null
  const href = explorerTransactionUrl(explorerUrl, txId)
  return href
    ? <a className="timeline-tx" href={href} target="_blank" rel="noreferrer">Transaction <code>{abbreviate(txId)}</code> <ExternalLink size={13} aria-hidden="true" /></a>
    : <span className="timeline-tx">Transaction <code title={txId}>{abbreviate(txId)}</code></span>
}

// The full values behind the short forms: transaction ID, block and any address a primary name named.
function ActionDetails({ action, viewerAuthority, ownerAddresses }: { action: ActivityAction, viewerAuthority: string, ownerAddresses: string[] }) {
  const addresses = action.events.map(event => activityEventDetail(event, viewerAuthority, ownerAddresses)).filter(detail => detail.startsWith('Dusk address: '))
  const actor = action.actor?.kind === 'address' ? action.actor.address : action.actor?.kind === 'authority' ? action.actor.authority : null
  if (!action.txId && !addresses.length && !actor) return null
  return <details><summary>Details</summary>
    <ul>
      {action.txId ? <li>Transaction ID <code>{action.txId}</code> <CopyValue value={action.txId} label="transaction ID" /></li> : null}
      {action.blockHeight !== null ? <li>Block {action.blockHeight.toLocaleString('en')}</li> : null}
      {actor ? <li>By <code>{actor}</code></li> : null}
      {[...new Set(addresses)].map(address => <li key={address}>{address}</li>)}
    </ul>
  </details>
}
