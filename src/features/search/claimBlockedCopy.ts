import type { NameResult, NameStatus } from '../../names/internal'
import { isSubname, overviewCopyForIssues } from '../domains/domainFormat'

/** Why the claim card can't offer the claim, in words that agree with the rest of the page. */
export function claimBlockedCopy({ blockedReason, displayName, quoteLoading, readOnly, registrationsPaused, resultIssues, resultStatus }: {
  blockedReason: string
  displayName: string
  quoteLoading: boolean
  readOnly: boolean
  registrationsPaused: boolean
  resultIssues: NameResult['issues']
  resultStatus: NameStatus
}): { heading: string, body: string } {
  if (resultStatus === 'registered') return { heading: 'This name is taken', body: overviewCopyForIssues(resultStatus, resultIssues) }
  const heading = 'This name can’t be claimed'
  if (resultStatus !== 'available') return { heading, body: overviewCopyForIssues(resultStatus, resultIssues) }
  // A subname is created by a holder of the name above it; it is never registered.
  if (isSubname(displayName)) return { heading, body: `Only the owner or manager of ${displayName.slice(displayName.indexOf('.') + 1)} can create ${displayName}.` }
  if (readOnly) return { heading, body: 'This site is read only. Names can’t be registered here.' }
  // The same words as the banner at the top of the page.
  if (registrationsPaused) return { heading: 'Registrations are paused', body: 'New reservations and registrations will resume when the operator reopens them.' }
  if (blockedReason) return { heading, body: blockedReason }
  if (quoteLoading) return { heading: 'Checking this name…', body: 'Checking its price and whether it’s open for registration.' }
  return { heading, body: 'It can’t be claimed right now. Try again later.' }
}
