import { TransactionStatusNotice } from '../../components/status/TransactionStatusNotice'
import { txStatusCopy } from '../../components/status/txStatus'
import { REGISTRATION_MIN_REVEAL_WAIT_BLOCKS, type DuskDomainTxState } from '../../names/internal'
import {
  walletSetupActionCopy,
  walletSetupActionTitle,
  type WalletConnectionStatus,
} from '../wallet/walletStatus'
import { formatWait } from './registrationCopy'
import { RegistrationWalletActionButton } from './RegistrationWalletActionButton'

export function RegistrationReviewStep({
  canPrepareCommit,
  commitBusy,
  commitStale,
  commitTxState,
  committed,
  installUrl,
  onOpenWalletConnection,
  onPrepareCommit,
  txBusy,
  walletSetupState,
}: {
  canPrepareCommit: boolean
  commitBusy: boolean
  commitStale: boolean
  commitTxState: DuskDomainTxState | null
  committed: boolean
  installUrl: string
  onOpenWalletConnection: () => void
  onPrepareCommit: () => void
  txBusy: boolean
  walletSetupState: WalletConnectionStatus
}) {
  const walletReady = walletSetupState === 'connected'
  const actionTitle = walletReady
    ? committed ? 'Reservation saved' : 'Sign the reservation'
    : walletSetupActionTitle(walletSetupState)
  const actionCopy = walletReady
    ? committed
      ? 'Check its status under Complete before signing again.'
      : `You can complete about ${formatWait(REGISTRATION_MIN_REVEAL_WAIT_BLOCKS)} after it confirms.`
    : walletSetupActionCopy(walletSetupState)

  return (
    <div className="register-action">
      <div className="register-action-copy">
        <strong>{actionTitle}</strong>
        <span>{actionCopy}</span>
      </div>
      {walletReady ? (
        <button
          className={committed ? 'commit-button' : 'primary-button compact'}
          disabled={!canPrepareCommit || txBusy}
          type="button"
          onClick={() => void onPrepareCommit()}
        >
          {commitBusy ? txStatusCopy(commitTxState?.status, commitTxState?.message) : commitStale ? 'Start again' : committed ? 'Saved' : 'Reserve'}
        </button>
      ) : (
        <RegistrationWalletActionButton
          className="primary-button compact"
          installUrl={installUrl}
          onOpenWalletConnection={onOpenWalletConnection}
          walletSetupState={walletSetupState}
        />
      )}
      {commitTxState ? <TransactionStatusNotice state={commitTxState} /> : null}
    </div>
  )
}
