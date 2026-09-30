import {
  DUSK_APPROX_BLOCK_TIME_SECONDS,
  getRecordDefinition,
  namehashHex,
  type IndexedNameSummary,
  type NameResult,
  type NameStatus,
  type RecordVisibility,
  type ResolverRecordKey,
  type SubnameExpiryPolicy,
} from '../../names/internal'
import type { MyNamePrimarySummary } from './MyDomainsView'

// Lifecycle values are block heights, or unix seconds when no block height was known.
const unixSecondsLifecycleFloor = 100_000_000

export function unixSecondsFromIso(value: string | null | undefined) {
  if (!value) return null
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return null
  return Math.floor(timestamp / 1000)
}

export function lifecycleHeightFromIndexed(
  isoValue: string | null | undefined,
  blockHeightValue: number | null | undefined,
  currentBlockHeight: number | null,
  nowSeconds: number,
) {
  if (Number.isFinite(blockHeightValue)) return Number(blockHeightValue)
  const unixSeconds = unixSecondsFromIso(isoValue)
  if (unixSeconds === null) return null
  if (currentBlockHeight === null) return unixSeconds
  return Math.max(0, currentBlockHeight + Math.ceil((unixSeconds - nowSeconds) / DUSK_APPROX_BLOCK_TIME_SECONDS))
}

export function lifecycleHeightToUnixSeconds(
  lifecycleHeight: number,
  currentBlockHeight: number | null,
  nowSeconds: number,
) {
  if (!Number.isFinite(lifecycleHeight) || lifecycleHeight <= 0) return null
  if (lifecycleHeight > unixSecondsLifecycleFloor) return lifecycleHeight
  if (currentBlockHeight !== null) {
    return nowSeconds + (lifecycleHeight - currentBlockHeight) * DUSK_APPROX_BLOCK_TIME_SECONDS
  }
  return nowSeconds + lifecycleHeight * DUSK_APPROX_BLOCK_TIME_SECONDS
}

// An unknown lifecycle value (0) is never reached.
export function lifecycleHeightReached(
  lifecycleHeight: number,
  currentBlockHeight: number | null,
  nowSeconds: number,
) {
  if (!Number.isFinite(lifecycleHeight) || lifecycleHeight <= 0) return false
  if (lifecycleHeight > unixSecondsLifecycleFloor) return nowSeconds >= lifecycleHeight
  return currentBlockHeight !== null && currentBlockHeight >= lifecycleHeight
}

// Only label.dusk is registered; every deeper name is a subname.
export function isSubname(name: string) {
  return name.replace(/\.dusk$/u, '').includes('.')
}

// The contract takes renewals only before expiry. After it the name is held until grace ends,
// when anyone can register it. The indexer may not report a grace end; then none is shown.
export function renewalWindowCopy(
  { expiresAt, graceEndsAt }: { expiresAt: number, graceEndsAt: number },
  currentBlockHeight: number | null,
  nowSeconds: number,
) {
  const expiry = formatLifecycleDay(expiresAt, currentBlockHeight, nowSeconds)
  const grace = graceEndsAt > 0 ? formatLifecycleDay(graceEndsAt, currentBlockHeight, nowSeconds) : null
  if (!lifecycleHeightReached(expiresAt, currentBlockHeight, nowSeconds)) {
    return grace
      ? `Runs until ${expiry}. Renew it before then. After that it can't be renewed; it is held until ${grace}, then anyone can register it.`
      : `Runs until ${expiry}. Renew it before then. After that it can't be renewed.`
  }
  if (lifecycleHeightReached(graceEndsAt, currentBlockHeight, nowSeconds)) {
    return `Expired on ${expiry}, so it can't be renewed. Anyone can register it now.`
  }
  return grace
    ? `Expired on ${expiry}, so it can't be renewed. It is held until ${grace}, then anyone can register it.`
    : `Expired on ${expiry}, so it can't be renewed.`
}

// The name header's badge. Renewal closes at expiry, and a subname is never renewed on its own.
export function lifecycleBadgeCopy(name: string, expiresAt: number, currentBlockHeight: number | null, nowSeconds: number) {
  if (!Number.isFinite(expiresAt) || expiresAt <= 0) return null
  const expiry = formatLifecycleDay(expiresAt, currentBlockHeight, nowSeconds)
  if (lifecycleHeightReached(expiresAt, currentBlockHeight, nowSeconds)) return `Expired ${expiry}`
  return isSubname(name) ? `Expires ${expiry}` : `Renews by ${expiry}`
}

// Subnames are never renewed on their own. Renewing a root name renews its inheriting subnames,
// down each chain of them; a fixed expiry stays as it was set, and so does everything below it.
// So only a subname directly under the root is promised renewal through its parent.
export function subnameExpiryCopy(
  name: string,
  expiresAt: number,
  expiryPolicy: SubnameExpiryPolicy | null,
  currentBlockHeight: number | null,
  nowSeconds: number,
) {
  const expiry = formatLifecycleDay(expiresAt, currentBlockHeight, nowSeconds)
  const expired = lifecycleHeightReached(expiresAt, currentBlockHeight, nowSeconds)
  const lead = expired ? `Expired on ${expiry}.` : `Runs until ${expiry}.`
  const parent = name.slice(name.indexOf('.') + 1)
  if (expiryPolicy === 'inherits_parent') {
    if (expired) return `${lead} It expired with ${parent}.`
    return isSubname(parent)
      ? `${lead} It expires with ${parent}.`
      : `${lead} It expires with ${parent}, and renewing ${parent} renews it too.`
  }
  if (expiryPolicy === 'fixed_before_parent') return `${lead} This date was fixed when it was created and can't be extended.`
  return `${lead} Subnames can't be renewed on their own.`
}

export function formatLifecycleDay(
  lifecycleHeight: number,
  currentBlockHeight: number | null,
  nowSeconds: number,
) {
  const unixSeconds = lifecycleHeightToUnixSeconds(lifecycleHeight, currentBlockHeight, nowSeconds)
  if (unixSeconds === null) return 'Unknown'
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10)
}

export function safeNamehashHex(name: string) {
  try {
    return namehashHex(name)
  } catch {
    return ''
  }
}

export function formatActivityTime(timestamp: string) {
  return new Date(timestamp).toISOString().slice(0, 16).replace('T', ' ')
}

export function blockHeightFromDateInput(value: string, currentBlockHeight: number | null, nowSeconds: number) {
  if (!value) throw new Error('Choose a fixed expiry date or use parent-inherited expiry.')

  const timestamp = Date.parse(`${value}T00:00:00.000Z`)
  if (!Number.isFinite(timestamp)) throw new Error('Choose a valid fixed expiry date.')
  const targetSeconds = Math.floor(timestamp / 1000)
  const baseBlockHeight = currentBlockHeight ?? 0
  return Math.max(baseBlockHeight, baseBlockHeight + Math.ceil((targetSeconds - nowSeconds) / DUSK_APPROX_BLOCK_TIME_SECONDS))
}

export function recordPlaceholder(key: ResolverRecordKey) {
  if (key === 'moonlight_address') return 'dusk1...'
  if (key === 'phoenix_payment_endpoint') return 'dusk1shielded...'
  if (key === 'evm_address') return '0x...'
  if (key === 'dusk_contract') return `0x${'0'.repeat(64)}`
  if (key === 'website') return 'https://example.com'
  if (key === 'avatar') return 'https://example.com/avatar.png'
  if (key === 'content_pointer') return 'ipfs://...'
  return 'Public description'
}

export function statusCopy(status: NameStatus) {
  if (status === 'available') return 'Available'
  if (status === 'registered') return 'Registered'
  if (status === 'reserved') return 'Reserved'
  return 'Needs review'
}


export function overviewCopyForIssues(status: NameStatus, issues: NameResult['issues']) {
  if (status === 'available') return 'This domain can be registered.'
  if (status === 'registered') return 'Review records, primary status, subdomains, and activity.'
  if (status === 'reserved') return 'This label is protected and cannot be registered through the public flow.'
  const blockingIssue = issues.find((issue) => issue.tone === 'danger') ?? issues[0]
  return blockingIssue ? policyIssueCopy(blockingIssue.text) : 'Check the domain and try again.'
}

export function policyIssueCopy(text: string) {
  if (text === 'Labels shorter than 3 characters are reserved.') {
    return 'Dusk Domains start at 3 characters. 1-2 character domains are reserved.'
  }
  return text
}

export function overviewStatusCopy(status: NameStatus) {
  if (status === 'available') return 'Available'
  if (status === 'registered') return 'Active'
  if (status === 'reserved') return 'Reserved'
  return 'Needs review'
}

export function overviewPrimaryCopy(status: NameStatus, verified: boolean) {
  if (status === 'available') return 'Set after claim'
  return verified ? 'Verified' : 'Needs setup'
}

export function myNamePrimarySummaryFromIndex(name: IndexedNameSummary): MyNamePrimarySummary | null {
  if (!name.primaryStatus) return null
  if (name.primaryStatus === 'verified') return { label: 'Verified', tone: 'success' }
  if (name.primaryStatus === 'mismatch') return { label: 'Not primary', tone: 'warning' }
  if (name.primaryStatus === 'missing') return { label: 'No primary', tone: 'warning' }
  return { label: 'No address', tone: 'muted' }
}

export function recordVisibilityLabel(visibility: RecordVisibility | undefined) {
  if (visibility === 'sensitive_public') return 'Public endpoint'
  if (visibility === 'public') return 'Public'
  return 'Record'
}

export function recordFreshnessCopy(recordDefinition: ReturnType<typeof getRecordDefinition>) {
  if (!recordDefinition) return 'Unsupported record'
  const minutes = Math.max(1, Math.round(recordDefinition.defaultTtlSeconds / 60))
  return `Updates within ${minutes} min`
}
