import type { NameStatus } from '../../names/internal'
import {
  overviewPrimaryCopy,
  overviewStatusCopy,
} from '../domains/domainFormat'

export function SearchResultOverviewGrid({
  displayName,
  primaryVerified,
  reservedByUser,
  resultStatus,
  subnameCount,
}: {
  displayName: string
  primaryVerified: boolean
  reservedByUser: boolean
  resultStatus: NameStatus
  subnameCount: number
}) {
  return (
    <div className="overview-grid">
      <div>
        <span>Domain</span>
        <strong>{displayName}</strong>
      </div>
      <div>
        <span>Status</span>
        <strong>{reservedByUser ? 'Reserved by you' : overviewStatusCopy(resultStatus)}</strong>
      </div>
      <div>
        <span>Primary</span>
        <strong>{overviewPrimaryCopy(resultStatus, primaryVerified)}</strong>
      </div>
      <div>
        <span>Subdomains</span>
        <strong>{resultStatus === 'registered' ? subnameCount : 'After claim'}</strong>
      </div>
    </div>
  )
}
