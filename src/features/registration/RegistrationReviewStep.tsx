import { CheckCircle2 } from 'lucide-react'
import { TransactionStatusNotice } from '../../components/status/TransactionStatusNotice'
import { txStatusCopy } from '../../components/status/txStatus'
import { REGISTRATION_MIN_REVEAL_WAIT_BLOCKS, type DuskNameTxState } from '../../names/internal'
import { abbreviate } from '../../utils/format'
import {
  walletSetupActionCopy,
  walletSetupActionTitle,
  type WalletConnectionStatus,
} from '../wallet/walletStatus'
import { RegistrationWalletActionButton } from './RegistrationWalletActionButton'

export function RegistrationReviewStep({
  canPrepareCommit,
  commitBusy,
  commitStale,
  commitTxState,
  committed,
  displayName,
  duration,
  installUrl,
  onOpenWalletConnection,
  onPrepareCommit,
  registerSetsPrimary,
  registrationTargetAddress,
  selectedAddress,
  txBusy,
  walletSetupState,
}: {
  canPrepareCommit: boolean
  commitBusy: boolean
  commitStale: boolean
  commitTxState: DuskNameTxState | null
  committed: boolean
  displayName: string
  duration: number
  installUrl: string
  onOpenWalletConnection: () => void
  onPrepareCommit: () => void
  registerSetsPrimary: boolean
  registrationTargetAddress: string
  selectedAddress: string
  txBusy: boolean
  walletSetupState: WalletConnectionStatus
}) {
  const walletReady = walletSetupState === 'connected'
  const actionTitle = walletReady
    ? committed ? 'Reservation submitted' : 'Reserve this domain'
    : walletSetupActionTitle(walletSetupState)
  const actionCopy = walletReady
    ? committed
      ? 'Continue to purchase once the reservation is ready.'
      : `Purchase unlocks ${REGISTRATION_MIN_REVEAL_WAIT_BLOCKS} blocks after confirmation.`
    : walletSetupActionCopy(walletSetupState)

  return (
    <div className="registration-review">
      <div className="review-list">
        <div>
          <span>Domain</span>
          <strong>{displayName}</strong>
        </div>
        <div>
          <span>Duration</span>
          <strong>{duration} {duration === 1 ? 'year' : 'years'}</strong>
        </div>
        <div>
          <span>Owner wallet</span>
          <strong>{selectedAddress ? abbreviate(selectedAddress) : '-'}</strong>
        </div>
        <div>
          <span>Address</span>
          <strong>{registrationTargetAddress ? abbreviate(registrationTargetAddress) : '-'}</strong>
        </div>
        <div>
          <span>Primary</span>
          <strong>{selectedAddress && registerSetsPrimary ? 'Set' : 'Skip'}</strong>
        </div>
      </div>

      <div className="includes review-includes">
        <h3>Next</h3>
        <span><CheckCircle2 size={16} /> Reserve</span>
        <span><CheckCircle2 size={16} /> Wait 5 blocks</span>
        <span><CheckCircle2 size={16} /> Complete</span>
      </div>

      <div className="step-action-card">
        <div>
          <strong>{actionTitle}</strong>
          <span>{actionCopy}</span>
        </div>
        {walletReady ? (
          <button
            className={committed ? 'commit-button ready' : 'commit-button'}
            disabled={!canPrepareCommit || txBusy}
            type="button"
            onClick={() => void onPrepareCommit()}
          >
            {commitBusy ? txStatusCopy(commitTxState?.status, commitTxState?.message) : commitStale ? 'Start again' : committed ? 'Reserved' : 'Reserve name'}
          </button>
        ) : (
          <RegistrationWalletActionButton
            className="commit-button wallet-recovery-button"
            installUrl={installUrl}
            onOpenWalletConnection={onOpenWalletConnection}
            walletSetupState={walletSetupState}
          />
        )}
        {commitTxState ? (
          <TransactionStatusNotice state={commitTxState} />
        ) : null}
      </div>
    </div>
  )
}
