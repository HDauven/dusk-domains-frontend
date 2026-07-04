import {
  DUSK_APPROX_BLOCK_TIME_SECONDS,
  getRecordDefinition,
  namehashHex,
  type IndexedNameSummary,
  type NameResult,
  type NameStatus,
  type RecordVisibility,
  type ResolverRecordKey,
} from '../../names/internal'
import { formatIsoDay } from '../registration/registrationCopy'
import type { MyNamePrimarySummary } from './MyDomainsView'

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
  if (lifecycleHeight > 100_000_000) return lifecycleHeight
  if (currentBlockHeight !== null) {
    return nowSeconds + (lifecycleHeight - currentBlockHeight) * DUSK_APPROX_BLOCK_TIME_SECONDS
  }
  return nowSeconds + lifecycleHeight * DUSK_APPROX_BLOCK_TIME_SECONDS
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

export function formatNameLifecycle(name: IndexedNameSummary) {
  const status = name.status ? `${name.status.slice(0, 1).toUpperCase()}${name.status.slice(1)}` : 'Unknown'
  if (!name.expiresAt) return status
  return `${status} until ${formatIsoDay(name.expiresAt)}`
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

export function overviewCopy(status: NameStatus) {
  return overviewCopyForIssues(status, [])
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
