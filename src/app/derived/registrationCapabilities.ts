import type { RegistrationCompletionState } from '../../features/registration/registrationCompletionState'
import type { PreparedRegistrationCommit } from '../../features/registration/usePendingReservations'
import { registrationCommitWindow } from '../../names/internal'

export function deriveRegistrationCapabilities({
  canRegister,
  commitBusy,
  committed,
  commitWindow,
  nodeHex,
  preparedCommit,
  registrationCompletion,
  registrationTargetReady,
  selectedAddress,
  txBusy,
  walletAuthorized,
}: {
  canRegister: boolean
  commitBusy: boolean
  committed: boolean
  commitWindow: ReturnType<typeof registrationCommitWindow>
  nodeHex: string
  preparedCommit: PreparedRegistrationCommit | null
  registrationCompletion: RegistrationCompletionState | null
  registrationTargetReady: boolean
  selectedAddress: string
  txBusy: boolean
  walletAuthorized: boolean
}) {
  const commitStale = commitWindow.status === 'stale'

  return {
    canPrepareCommit: Boolean(walletAuthorized && selectedAddress && nodeHex && canRegister && (!committed || commitStale) && !commitBusy),
    canRevealRegistration: Boolean(
      walletAuthorized
      && committed
      && preparedCommit
      && canRegister
      && registrationTargetReady
      && commitWindow.status === 'ready'
      && registrationCompletion?.status !== 'executed'
      && !txBusy,
    ),
    commitStale,
  }
}
