import { registrationCommitMatchesSession } from './pendingReservationTypes'
import { formatWait } from './registrationCopy'
import type { UseRegistrationActionsProps } from './registrationActionTypes'

type CompleteRegistrationPreflightResult =
  | { ok: true }
  | { message?: string, ok: false, step?: 'review' }

export function completeRegistrationPreflight({
  canRegister,
  committed,
  commitWindow,
  preparedCommit,
  registrationTargetAddressErrors,
  registrationTargetReady,
  selectedAddress,
  selectedAuthority,
  runtimeConfig,
}: UseRegistrationActionsProps): CompleteRegistrationPreflightResult {
  if (!canRegister || !committed || !preparedCommit || !selectedAddress) {
    return { ok: false }
  }

  if (!registrationCommitMatchesSession(preparedCommit, selectedAuthority, selectedAddress, runtimeConfig.chainId)) {
    return { ok: false, message: 'The wallet session changed. Open this reservation with the wallet that reserved it.' }
  }

  if (!registrationTargetReady) {
    return {
      ok: false,
      step: 'review',
      message: registrationTargetAddressErrors[0] ?? 'Enter a valid Dusk address before completing registration.',
    }
  }

  if (commitWindow.status !== 'ready') {
    return {
      ok: false,
      message: commitWindow.status === 'waiting'
        ? `Registration is available in about ${formatWait(commitWindow.waitBlocks)}.`
        : 'The reservation expired. Start registration again.',
    }
  }

  return { ok: true }
}
