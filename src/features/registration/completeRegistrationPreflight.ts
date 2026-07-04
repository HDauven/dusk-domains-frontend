import { pluralize } from './registrationCopy'
import type { UseRegistrationActionsProps } from './registrationActionTypes'

type CompleteRegistrationPreflightResult =
  | { ok: true }
  | { message?: string, ok: false, step?: 'setup' }

export function completeRegistrationPreflight({
  canRegister,
  committed,
  commitWindow,
  preparedCommit,
  registrationTargetAddressErrors,
  registrationTargetReady,
  selectedAddress,
}: UseRegistrationActionsProps): CompleteRegistrationPreflightResult {
  if (!canRegister || !committed || !preparedCommit || !selectedAddress) {
    return { ok: false }
  }

  if (!registrationTargetReady) {
    return {
      ok: false,
      step: 'setup',
      message: registrationTargetAddressErrors[0] ?? 'Enter a valid Dusk address before completing registration.',
    }
  }

  if (commitWindow.status !== 'ready') {
    return {
      ok: false,
      message: commitWindow.status === 'waiting'
        ? `Registration is available in ${commitWindow.waitBlocks} ${pluralize(commitWindow.waitBlocks, 'block')}.`
        : 'The reservation expired. Start registration again.',
    }
  }

  return { ok: true }
}
