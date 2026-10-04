import { registrationCommitMatchesSession } from '../../features/registration/pendingReservationTypes'
import type { StrandedCommitment } from '../../features/registration/pendingReservationTypes'
import type { RegistrationCompletionState } from '../../features/registration/registrationCompletionState'
import type { PreparedRegistrationCommit } from '../../features/registration/usePendingReservations'
import { registrationCommitWindow } from '../../names/internal'

export function deriveRegistrationCapabilities({
  registrationsPaused = false,
  canRegister,
  chainId,
  commitBusy,
  committed,
  commitWindow,
  nodeHex,
  preparedCommit,
  registrationCompletion,
  registrationTargetReady,
  selectedAddress,
  selectedAuthority,
  strandedCommitment,
  txBusy,
  walletAuthorized,
}: {
  registrationsPaused?: boolean
  canRegister: boolean
  chainId: string
  commitBusy: boolean
  committed: boolean
  commitWindow: ReturnType<typeof registrationCommitWindow>
  nodeHex: string
  preparedCommit: PreparedRegistrationCommit | null
  registrationCompletion: RegistrationCompletionState | null
  registrationTargetReady: boolean
  selectedAddress: string
  selectedAuthority: string
  strandedCommitment: StrandedCommitment | null
  txBusy: boolean
  walletAuthorized: boolean
}) {
  const commitStale = commitWindow.status === 'stale'
  // Only for the account that found it stranded: a reservation from another account is not its to replace.
  const reservationStranded = Boolean(
    preparedCommit
    && preparedCommit.commitment === strandedCommitment?.commitment
    && selectedAuthority
    && selectedAuthority.toLowerCase() === strandedCommitment.controller.toLowerCase(),
  )

  return {
    canPrepareCommit: Boolean(!registrationsPaused && walletAuthorized && selectedAddress && nodeHex && canRegister && (!committed || commitStale) && !commitBusy),
    canRevealRegistration: Boolean(
      !registrationsPaused && walletAuthorized
      && committed
      && registrationCommitMatchesSession(preparedCommit, selectedAuthority, selectedAddress, chainId)
      && canRegister
      && registrationTargetReady
      && commitWindow.status === 'ready'
      && registrationCompletion?.status !== 'executed'
      && !reservationStranded
      && !txBusy,
    ),
    // As canPrepareCommit, but to replace a stranded commitment rather than make a first one.
    canRestartReservation: Boolean(
      !registrationsPaused && walletAuthorized && selectedAddress && nodeHex && canRegister && (reservationStranded || commitStale) && !commitBusy && !txBusy,
    ),
    commitStale,
    reservationStranded,
  }
}
