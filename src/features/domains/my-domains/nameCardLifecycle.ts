import { DUSK_APPROX_BLOCK_TIME_SECONDS, type IndexedNameSummary } from '../../../names/internal'
import { formatLifecycleDay, isSubname, renewalDeadline, unixSecondsFromIso } from '../domainFormat'

const SOON_SECONDS = 30 * 24 * 60 * 60

// Lifecycle from block heights; the indexer's dates are estimates and have been wrong before.
// Root names can be renewed until grace ends. Subnames are never renewed on their own,
// so they only show when they end.
export function nameCardLifecycle(name: IndexedNameSummary, currentBlockHeight: number | null) {
  const subname = isSubname(name.canonicalName)
  const ends = subname ? 'Expires' : 'Renews by'
  const expiresAt = name.expiresAtBlockHeight
  const deadline = renewalDeadline({ expiresAt: expiresAt ?? 0, graceEndsAt: name.graceEndsAtBlockHeight ?? 0 })
  const nowSeconds = Math.floor(Date.now() / 1000)
  // Without heights to compare, the indexer's status and dates say whether it has expired.
  const expiredByIndexer = name.status === 'expired'
    || (name.expiresAt !== null && Date.parse(name.expiresAt) <= nowSeconds * 1000)
  const estimatedDeadline = renewalDeadline({ expiresAt: unixSecondsFromIso(name.expiresAt) ?? 0, graceEndsAt: unixSecondsFromIso(name.graceEndsAt) ?? 0 })
  const expiredCopy = (day: string) => !subname && estimatedDeadline > nowSeconds
    ? `Expired ${day}. Renew by ${formatLifecycleDay(estimatedDeadline, null, nowSeconds)} to keep it`
    : `Expired ${day}`
  if (expiresAt == null) {
    if (!name.expiresAt) return { tone: '', copy: '' }
    const day = name.expiresAt.slice(0, 10)
    return expiredByIndexer ? { tone: 'danger', copy: expiredCopy(day) } : { tone: '', copy: `${ends} ${day}` }
  }
  // Heights can't be placed without the current one, so the indexer's date stands in.
  if (currentBlockHeight === null) {
    const day = name.expiresAt?.slice(0, 10)
    if (!day) return { tone: expiredByIndexer ? 'danger' : '', copy: expiredByIndexer ? 'Expired' : '' }
    return expiredByIndexer ? { tone: 'danger', copy: expiredCopy(day) } : { tone: '', copy: `${ends} ${day}` }
  }
  const expires = formatLifecycleDay(expiresAt, currentBlockHeight, nowSeconds)
  if (currentBlockHeight >= deadline || (subname && currentBlockHeight >= expiresAt)) {
    return { tone: 'danger', copy: `Expired ${expires}` }
  }
  if (currentBlockHeight >= expiresAt) {
    return { tone: 'danger', copy: `Expired ${expires}. Renew by ${formatLifecycleDay(deadline, currentBlockHeight, nowSeconds)} to keep it` }
  }
  const left = (expiresAt - currentBlockHeight) * DUSK_APPROX_BLOCK_TIME_SECONDS
  if (left >= SOON_SECONDS) return { tone: '', copy: `${ends} ${expires}` }
  return { tone: 'warn', copy: subname ? `Expires soon: ${expires}` : `Renew soon: ends ${expires}` }
}
