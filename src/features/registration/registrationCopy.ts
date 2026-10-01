import { txStatusCopy } from '../../components/status/txStatus'
import {
  DUSK_APPROX_BLOCK_TIME_SECONDS,
  REGISTRATION_MIN_REVEAL_WAIT_BLOCKS,
  registrationCommitWindow,
  type DuskDomainTxState,
} from '../../names/internal'
import { pluralize } from '../../utils/format'
import type { RegistrationCompletionState } from './registrationCompletionState'

type CommitWindowStatus = ReturnType<typeof registrationCommitWindow>['status']

// Blocks are about ten seconds each; people think in time, not block counts.
export function formatWait(blocks: number) {
  const seconds = Math.max(0, blocks) * DUSK_APPROX_BLOCK_TIME_SECONDS
  if (seconds < 60) return `${Math.max(10, Math.round(seconds / 10) * 10)} seconds`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} ${pluralize(minutes, 'minute')}`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours} ${pluralize(hours, 'hour')}`
  const days = Math.round(hours / 24)
  return `${days} ${pluralize(days, 'day')}`
}

// The reservation line above the button already says how long the wait is.
export function revealButtonCopy(status: CommitWindowStatus) {
  if (status === 'missing') return 'Waiting for confirmation'
  if (status === 'stale') return 'Start again'
  return 'Register'
}

export function completeRegistrationButtonCopy(
  progress: RegistrationCompletionState | null,
  txBusy: boolean,
  txState: DuskDomainTxState | null,
  status: CommitWindowStatus,
) {
  if (progress?.status === 'executed') return 'Registration complete'
  if (progress?.status === 'failed') return 'Retry registration'
  if (progress?.status === 'running') {
    const activeStep = progress.steps.find((step) => step.id === progress.activeStep)
    return activeStep ? activeStep.title : 'Completing registration'
  }
  if (txBusy) return txStatusCopy(txState?.status, txState?.message)
  return revealButtonCopy(status)
}

export function pendingReservationStatusCopy(status: CommitWindowStatus, waitBlocks: number) {
  if (status === 'missing') return 'Unconfirmed'
  if (status === 'waiting') return `Ready in about ${formatWait(waitBlocks)}`
  if (status === 'stale') return 'Expired'
  return 'Ready'
}

export function pendingReservationActionCopy(status: CommitWindowStatus) {
  if (status === 'ready') return 'Register'
  if (status === 'stale') return 'Start over'
  return 'Open'
}

export function pendingReservationNextStepCopy(status: CommitWindowStatus) {
  if (status === 'missing') return 'Check your wallet before retrying. If you canceled approval, forget this saved request to start again.'
  if (status === 'waiting') return 'Open this reservation to continue when it is ready.'
  if (status === 'stale') return 'This reservation expired. Reserve again to continue.'
  return 'Ready to register.'
}

export function savedReservationOverviewCopy(
  status: CommitWindowStatus = 'missing',
  waitBlocks = 0,
) {
  if (status === 'ready') return 'Your reservation is ready. Register to activate the name.'
  if (status === 'waiting') return `Your reservation is saved. Registration unlocks in about ${formatWait(waitBlocks)}.`
  if (status === 'stale') return 'Your saved reservation expired. Start again to claim this name.'
  return 'Your reservation is saved and waiting for confirmation.'
}

export function commitWindowCopy(
  status: CommitWindowStatus,
  staleInBlocks: number,
) {
  if (status === 'missing' || status === 'stale') return pendingReservationNextStepCopy(status)

  if (status === 'waiting') return `Reservation confirmed. It stays valid for about ${formatWait(staleInBlocks)}.`

  return `Sign to register the name and pay. This reservation stays valid for about ${formatWait(staleInBlocks)}.`
}

// The reveal would go to a registry added after the commit, which never saw it.
export function strandedReservationCopy() {
  return `Dusk Domains added capacity since you reserved, so this reservation can't be completed. Reserve again; you can complete about ${formatWait(REGISTRATION_MIN_REVEAL_WAIT_BLOCKS)} after it confirms.`
}

export function countdownCopy(seconds: number) {
  return seconds > 0 ? `Ready in about ${Math.ceil(seconds)} s` : 'Waiting for the next block…'
}

