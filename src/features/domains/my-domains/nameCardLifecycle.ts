import { DUSK_APPROX_BLOCK_TIME_SECONDS, type IndexedNameSummary } from '../../../names/internal'
import { formatLifecycleDay, isSubname } from '../domainFormat'

const SOON_SECONDS = 30 * 24 * 60 * 60

// Lifecycle from block heights; the indexer's dates are estimates and have been wrong before.
// Renewal closes at expiry: after it a name is only held until grace ends. Subnames are never
// renewed on their own, so they only show when they end.
export function nameCardLifecycle(name: IndexedNameSummary, currentBlockHeight: number | null) {
  const subname = isSubname(name.canonicalName)
  const ends = subname ? 'Expires' : 'Renews by'
  const expiresAt = name.expiresAtBlockHeight
  const graceEndsAt = name.graceEndsAtBlockHeight ?? expiresAt
  const nowSeconds = Math.floor(Date.now() / 1000)
  // Without heights to compare, the indexer's status and dates say whether it has expired.
  const expiredByIndexer = name.status === 'expired'
    || (name.expiresAt !== null && Date.parse(name.expiresAt) <= nowSeconds * 1000)
  if (expiresAt == null || graceEndsAt == null) {
    if (!name.expiresAt) return { tone: '', copy: '' }
    const day = name.expiresAt.slice(0, 10)
    return expiredByIndexer ? { tone: 'danger', copy: `Expired ${day}` } : { tone: '', copy: `${ends} ${day}` }
  }
  // Heights can't be placed without the current one, so the indexer's date stands in.
  if (currentBlockHeight === null) {
    const day = name.expiresAt?.slice(0, 10)
    if (!day) return { tone: expiredByIndexer ? 'danger' : '', copy: expiredByIndexer ? 'Expired' : '' }
    return expiredByIndexer ? { tone: 'danger', copy: `Expired ${day}` } : { tone: '', copy: `${ends} ${day}` }
  }
  const expires = formatLifecycleDay(expiresAt, currentBlockHeight, nowSeconds)
  if (currentBlockHeight >= graceEndsAt || (subname && currentBlockHeight >= expiresAt)) {
    return { tone: 'danger', copy: `Expired ${expires}` }
  }
  if (currentBlockHeight >= expiresAt) {
    return { tone: 'danger', copy: `Expired ${expires}. Held until ${formatLifecycleDay(graceEndsAt, currentBlockHeight, nowSeconds)}, then anyone can register it` }
  }
  const left = (expiresAt - currentBlockHeight) * DUSK_APPROX_BLOCK_TIME_SECONDS
  if (left >= SOON_SECONDS) return { tone: '', copy: `${ends} ${expires}` }
  return { tone: 'warn', copy: subname ? `Expires soon: ${expires}` : `Renew soon: ends ${expires}` }
}
