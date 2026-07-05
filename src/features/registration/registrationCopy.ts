import { txStatusCopy } from '../../components/status/txStatus'
import {
  REGISTRATION_MIN_REVEAL_WAIT_BLOCKS,
  registrationCommitWindow,
  type DuskDomainTxState,
  type PendingNameReservation,
} from '../../names/internal'
import type { RegistrationCompletionState } from './registrationCompletionState'

type CommitWindowStatus = ReturnType<typeof registrationCommitWindow>['status']

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural
}

export function formatPendingReservationDetail(reservation: PendingNameReservation) {
  return `Reserved ${formatIsoDay(reservation.createdAt)} · ${reservation.durationYears} ${pluralize(reservation.durationYears, 'year')}`
}

export function formatIsoDay(value: string) {
  return new Date(value).toISOString().slice(0, 10)
}

export function revealButtonCopy(status: CommitWindowStatus, waitBlocks: number) {
  if (status === 'missing') return 'Waiting for reservation confirmation'
  if (status === 'waiting') return `Ready in ${waitBlocks} ${pluralize(waitBlocks, 'block')}`
  if (status === 'stale') return 'Start again'
  if (status === 'ready') return 'Complete registration'
  return 'Complete registration'
}

export function completeRegistrationButtonCopy(
  progress: RegistrationCompletionState | null,
  txBusy: boolean,
  txState: DuskDomainTxState | null,
  status: CommitWindowStatus,
  waitBlocks: number,
) {
  if (progress?.status === 'executed') return 'Registration complete'
  if (progress?.status === 'failed') return 'Retry registration'
  if (progress?.status === 'running') {
    const activeStep = progress.steps.find((step) => step.id === progress.activeStep)
    return activeStep ? activeStep.title : 'Completing registration'
  }
  if (txBusy) return txStatusCopy(txState?.status, txState?.message)
  return revealButtonCopy(status, waitBlocks)
}

export function pendingReservationStatusCopy(status: CommitWindowStatus, waitBlocks: number) {
  if (status === 'missing') return 'Confirming'
  if (status === 'waiting') return `Ready in ${waitBlocks} ${pluralize(waitBlocks, 'block')}`
  if (status === 'stale') return 'Expired'
  return 'Ready'
}

export function pendingReservationActionCopy(status: CommitWindowStatus) {
  if (status === 'ready') return 'Finish'
  if (status === 'stale') return 'Start over'
  return 'Open'
}

export function pendingReservationNextStepCopy(status: CommitWindowStatus, waitBlocks: number) {
  if (status === 'missing') return 'We will show it here as soon as the reservation confirms.'
  if (status === 'waiting') return `Registration unlocks in ${waitBlocks} ${pluralize(waitBlocks, 'block')}.`
  if (status === 'stale') return 'This reservation expired. Reserve it again to continue.'
  return 'Ready to complete now.'
}

export function savedReservationOverviewCopy(
  status: CommitWindowStatus = 'missing',
  waitBlocks = 0,
) {
  if (status === 'ready') return 'Your reservation is ready. Finish registration to activate the name.'
  if (status === 'waiting') return `Your reservation is saved. Registration unlocks in ${waitBlocks} ${pluralize(waitBlocks, 'block')}.`
  if (status === 'stale') return 'Your saved reservation expired. Start again to claim this name.'
  return 'Your reservation is saved and waiting for confirmation.'
}

export function commitWindowCopy(
  status: CommitWindowStatus,
  waitBlocks: number,
  staleInBlocks: number,
) {
  if (status === 'missing') {
    return `Start by reserving the name. Registration unlocks ${REGISTRATION_MIN_REVEAL_WAIT_BLOCKS} blocks after the reservation confirms.`
  }

  if (status === 'waiting') {
    return `Reservation confirmed. Registration unlocks in ${waitBlocks} ${pluralize(waitBlocks, 'block')} and expires in ${formatBlocks(staleInBlocks)}.`
  }

  if (status === 'stale') {
    return 'This reservation expired. Start registration again.'
  }

  return `Ready to complete. This reservation expires in ${formatBlocks(staleInBlocks)}.`
}

function formatBlocks(blocks: number) {
  if (blocks < 1) return '0 blocks'
  if (blocks < 100) return `${blocks} ${pluralize(blocks, 'block')}`
  const estimatedMinutes = Math.round((blocks * 10) / 60)
  if (estimatedMinutes < 60) return `about ${estimatedMinutes}m`
  const estimatedHours = Math.round(estimatedMinutes / 60)
  return `about ${estimatedHours}h`
}
