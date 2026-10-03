import type { PremiumConfirmationQuote } from './premiumTiming'
import { formatLuxNumberAsDusk } from '../treasury/feeConfig'
import { ReservationCountdown } from './ReservationCountdown'
import { Button } from '../../components/ui/Button'
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

export function RegistrationPurchaseStep({ reservation, purchase, wallet, quote = {} }: {
  reservation: {
    canRestartReservation: boolean
    commitWindow: CommitWindow
    onRestartReservation: () => void
    reservationStranded: boolean
  }
  purchase: {
    canRevealRegistration: boolean
    onRegisterName: (confirmedTotalLux?: number) => void
    onSetAddress: () => void
    registrationCompletion: RegistrationCompletionState | null
    txBusy: boolean
    txState: DuskDomainTxState | null
  }
  wallet: {
    installUrl: string
    onOpenWalletConnection: () => void
    walletSetupState: WalletConnectionStatus
  }
  quote?: {
    onWaitForPremium?: () => void
    premiumConfirmation?: PremiumConfirmationQuote | null
  }
}) {
  const {
    canRestartReservation,
    commitWindow,
    onRestartReservation,
    reservationStranded,
  } = reservation
  const {
    canRevealRegistration,
    onRegisterName,
    onSetAddress,
    registrationCompletion,
    txBusy,
    txState,
  } = purchase
  const {
    installUrl,
    onOpenWalletConnection,
    walletSetupState,
  } = wallet
  const {
    onWaitForPremium,
    premiumConfirmation,
  } = quote
  const showPremiumConfirmation = premiumConfirmation && canRevealRegistration && !reservationStranded && commitWindow.status === 'ready'
  const walletReady = walletSetupState === 'connected'
  const registrationComplete = registrationCompletion?.status === 'executed'
  // While the second signature runs, or once it has, the progress card is the only thing to show.
  const actionDone = registrationCompletion?.status === 'running' || registrationComplete
  const reservationCopy = reservationStranded
    ? 'Out of date'
    : pendingReservationStatusCopy(commitWindow.status, commitWindow.waitBlocks)
  const settled = commitWindow.status === 'waiting'
    ? Math.min(1, Math.max(0.04, 1 - commitWindow.waitBlocks / REGISTRATION_MIN_REVEAL_WAIT_BLOCKS))
    : 1
  const actionTitle = walletReady
    ? reservationStranded ? 'Reserve again' : commitWindow.status === 'stale' ? 'Reservation expired' : 'Register'
    : walletSetupActionTitle(walletSetupState)
  const actionCopy = walletReady
    ? reservationStranded
      ? strandedReservationCopy()
      : commitWindowCopy(commitWindow.status, commitWindow.staleInBlocks)
    : walletSetupActionCopy(walletSetupState)

  return (
    <div className="register-step">
      {actionDone ? null : (
        <div className={`register-reservation ${reservationStranded ? 'stale' : commitWindow.status}`}>
          <span>Reservation</span>
          {commitWindow.status === 'waiting' ? <ReservationCountdown key={commitWindow.waitBlocks} blocks={commitWindow.waitBlocks} /> : <strong>{reservationCopy}</strong>}
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
            {!walletReady || reservationStranded || commitWindow.status === 'stale' ? <strong>{actionTitle}</strong> : null}
            {showPremiumConfirmation ? <span>The price drops to {formatLuxNumberAsDusk(premiumConfirmation.nextTotalLux)} at <time dateTime={premiumConfirmation.nextStepAt}>{new Date(premiumConfirmation.nextStepAt).toLocaleString()}</time>.</span> : <span>{actionCopy}</span>}
          </div>
          {walletReady && (reservationStranded || commitWindow.status === 'stale') ? (
            <Button variant="primary"
              className="compact"
              disabled={!canRestartReservation} loading={txBusy}
              type="button"
              onClick={() => void onRestartReservation()}
            >
              Reserve again
              <ArrowRight size={17} />
            </Button>
          ) : walletReady && showPremiumConfirmation ? (
            <div className="register-wallet-actions">
              <Button variant="secondary" type="button" disabled={txBusy} onClick={onWaitForPremium}>Wait</Button>
              <Button variant="primary" type="button" disabled={!canRevealRegistration} loading={txBusy}
                onClick={() => onRegisterName(premiumConfirmation.totalLux)}>Register at {formatLuxNumberAsDusk(premiumConfirmation.totalLux)}</Button>
            </div>
          ) : walletReady ? (
            <Button variant="primary"
              className="compact"
              disabled={!canRevealRegistration} loading={txBusy}
              type="button"
              onClick={() => void onRegisterName()}
            >
              {completeRegistrationButtonCopy(registrationCompletion, txBusy, txState, commitWindow.status)}
              <ArrowRight size={17} />
            </Button>
          ) : (
            <RegistrationWalletActionButton
              className="button-primary compact"
              installUrl={installUrl}
              onOpenWalletConnection={onOpenWalletConnection}
              walletSetupState={walletSetupState}
            />
          )}
        </div>
      )}

      {registrationCompletion ? (
        <RegistrationCompletionProgress txState={txState} progress={registrationCompletion} onSetAddress={onSetAddress} />
      ) : txState ? (
        <TransactionStatusNotice state={txState} />
      ) : null}
    </div>
  )
}
