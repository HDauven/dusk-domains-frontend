import { browserWriteTxStateVisible } from './appHelpers'
import type { MyNamePrimarySummary } from '../features/domains/MyDomainsView'
import {
  pendingReservationActionCopy,
} from '../features/registration/registrationCopy'
import type { RegistrationCompletionState } from '../features/registration/registrationCompletionState'
import {
  recordBrowserWriteProofUiConfirmation,
  registrationCommitWindow,
  type DuskDomainTxState,
  type IndexedNameSummary,
  type PendingNameReservation,
  type RegistrationCommitWindow,
} from '../names/internal'

type ProofConfirmation = Parameters<typeof recordBrowserWriteProofUiConfirmation>[0]['confirmation']

export function myNamesProofConfirmation({
  commitTxState,
  currentBlockHeight,
  managementTxState,
  myNamePrimarySummaries,
  myNames,
  pendingReservations,
  primaryTxState,
  recordTxState,
  registrationCompletion,
  renewalTxState,
  subnameTxState,
  txState,
}: {
  commitTxState: DuskDomainTxState | null
  currentBlockHeight: number | null
  managementTxState: DuskDomainTxState | null
  myNamePrimarySummaries: Record<string, MyNamePrimarySummary>
  myNames: IndexedNameSummary[]
  pendingReservations: PendingNameReservation[]
  primaryTxState: DuskDomainTxState | null
  recordTxState: DuskDomainTxState | null
  registrationCompletion: RegistrationCompletionState | null
  renewalTxState: DuskDomainTxState | null
  subnameTxState: DuskDomainTxState | null
  txState: DuskDomainTxState | null
}): { confirmation: ProofConfirmation, name: string } | null {
  const activeName = myNames.find((name) => name.status === 'active')
  const pendingReservationVisible = pendingReservations.length > 0
  const revealReadinessVisible = pendingReservations.some((reservation) => (
    registrationCommitWindow(reservation.committedBlockHeight, currentBlockHeight).status === 'ready'
  ))
  const activeNameVisible = Boolean(activeName)
  const verifiedPrimaryVisible = myNames.some((name) => myNamePrimarySummaries[name.node]?.tone === 'success')
  const pendingOrFailedTxStateVisible = browserWriteTxStateVisible([
    commitTxState,
    txState,
    managementTxState,
    renewalTxState,
    recordTxState,
    primaryTxState,
    subnameTxState,
  ], registrationCompletion)

  if (
    !activeName
    || !pendingReservationVisible
    || !revealReadinessVisible
    || !activeNameVisible
    || !verifiedPrimaryVisible
    || !pendingOrFailedTxStateVisible
  ) return null

  return {
    name: activeName.canonicalName,
    confirmation: {
      pendingReservationVisible,
      revealReadinessVisible,
      activeNameVisible,
      verifiedPrimaryVisible,
      pendingOrFailedTxStateVisible,
    },
  }
}

export function reservationSearchProofConfirmation({
  displayName,
  savedReservation,
  savedReservationWindow,
}: {
  displayName: string
  savedReservation: PendingNameReservation | null
  savedReservationWindow: RegistrationCommitWindow | null
}): { confirmation: ProofConfirmation, name: string } | null {
  if (!savedReservation || !savedReservationWindow) return null

  const searchedReservedName = displayName.toLowerCase() === savedReservation.name.toLowerCase()
  const reservedByYouVisible = true
  const resumeRegistrationVisible = true
  const finishCtaVisible = pendingReservationActionCopy(savedReservationWindow.status) === 'Finish'

  if (!searchedReservedName || !finishCtaVisible) return null

  return {
    name: displayName,
    confirmation: {
      searchedReservedName,
      reservedByYouVisible,
      resumeRegistrationVisible,
      finishCtaVisible,
    },
  }
}
