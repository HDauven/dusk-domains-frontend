import { ArrowRight } from 'lucide-react'
import { TransactionStatusNotice } from '../../components/status/TransactionStatusNotice'
import { REGISTRATION_MIN_REVEAL_WAIT_BLOCKS, type DuskDomainTxState } from '../../names/internal'
import {
  walletSetupActionCopy,
  walletSetupActionTitle,
  type WalletConnectionStatus,
} from '../wallet/walletStatus'
import type { CommitWindow } from './flow/types'
import {
  commitWindowCopy,
  completeRegistrationButtonCopy,
  pendingReservationStatusCopy,
  strandedReservationCopy,
} from './registrationCopy'
import type { RegistrationCompletionState } from './registrationCompletionState'
import { RegistrationCompletionProgress } from './RegistrationCompletionProgress'
import { RegistrationWalletActionButton } from './RegistrationWalletActionButton'

export function RegistrationPurchaseStep({
  canRestartReservation,
  canRevealRegistration,
  commitWindow,
  installUrl,
  onOpenWalletConnection,
  onRegisterName,
  onRestartReservation,
  onSetAddress,
  registrationCompletion,
  reservationStranded,
  txBusy,
  txState,
  walletSetupState,
}: {
  canRestartReservation: boolean
  canRevealRegistration: boolean
  commitWindow: CommitWindow
  installUrl: string
  onOpenWalletConnection: () => void
  onRegisterName: () => void
  onRestartReservation: () => void
  onSetAddress: () => void
  registrationCompletion: RegistrationCompletionState | null
  reservationStranded: boolean
  txBusy: boolean
  txState: DuskDomainTxState | null
  walletSetupState: WalletConnectionStatus
}) {
  const walletReady = walletSetupState === 'connected'
  const registrationComplete = registrationCompletion?.status === 'executed'
  // While the second signature runs, or once it has, the progress card is the only thing to show.
  const actionDone = registrationCompletion?.status === 'running' || registrationComplete
  const reservation = reservationStranded
    ? 'Out of date'
    : pendingReservationStatusCopy(commitWindow.status, commitWindow.waitBlocks)
  const settled = commitWindow.status === 'waiting'
    ? Math.min(1, Math.max(0.04, 1 - commitWindow.waitBlocks / REGISTRATION_MIN_REVEAL_WAIT_BLOCKS))
    : 1
  const actionTitle = walletReady
    ? reservationStranded ? 'Reserve again' : commitWindow.status === 'stale' ? 'Reservation expired' : 'Complete the claim'
    : walletSetupActionTitle(walletSetupState)
  const actionCopy = walletReady
    ? reservationStranded
      ? strandedReservationCopy()
      : commitWindowCopy(commitWindow.status, commitWindow.waitBlocks, commitWindow.staleInBlocks)
    : walletSetupActionCopy(walletSetupState)

  return (
    <div className="register-step">
      {registrationComplete ? null : (
        <div className={`register-reservation ${reservationStranded ? 'stale' : commitWindow.status}`}>
          <span>Reservation</span>
          <strong>{reservation}</strong>
          {commitWindow.status === 'waiting' ? (
            <div className="register-settle" role="progressbar" aria-label="Reservation settling" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(settled * 100)}>
              <span style={{ width: `${settled * 100}%` }} />
            </div>
          ) : null}
        </div>
      )}

      {actionDone ? null : (
        <div className="register-action">
          <div className="register-action-copy">
            <strong>{actionTitle}</strong>
            <span>{actionCopy}</span>
          </div>
          {walletReady && reservationStranded ? (
            <button
              className="primary-button compact"
              disabled={!canRestartReservation}
              type="button"
              onClick={() => void onRestartReservation()}
            >
              Reserve again
              <ArrowRight size={17} />
            </button>
          ) : walletReady ? (
            <button
              className="primary-button compact"
              disabled={!canRevealRegistration}
              type="button"
              onClick={() => void onRegisterName()}
            >
              {completeRegistrationButtonCopy(registrationCompletion, txBusy, txState, commitWindow.status)}
              <ArrowRight size={17} />
            </button>
          ) : (
            <RegistrationWalletActionButton
              className="primary-button compact"
              installUrl={installUrl}
              onOpenWalletConnection={onOpenWalletConnection}
              walletSetupState={walletSetupState}
            />
          )}
        </div>
      )}

      {registrationCompletion ? (
        <RegistrationCompletionProgress progress={registrationCompletion} onSetAddress={onSetAddress} />
      ) : txState ? (
        <TransactionStatusNotice state={txState} />
      ) : null}
    </div>
  )
}
