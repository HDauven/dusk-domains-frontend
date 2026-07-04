import type { NameStatus } from '../../names/internal'
import { statusCopy } from '../domains/domainFormat'

export function AvailabilityBanner({
  displayName,
  reserved,
  status,
}: {
  displayName: string
  reserved: boolean
  status: NameStatus
}) {
  return (
    <div className={`availability-banner ${reserved ? 'reserved' : status}`}>
      <div className="availability-copy">
        <span>Search result</span>
        <h2>{displayName}</h2>
      </div>
      <span className="availability-pill">{reserved ? 'Reserved by you' : statusCopy(status)}</span>
    </div>
  )
}
