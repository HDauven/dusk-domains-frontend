import { Button } from '../../components/ui/Button'
import { TransactionStatusNotice } from '../../components/status/TransactionStatusNotice'
import { txStatusCopy } from '../../components/status/txStatus'
import { REGISTRATION_MIN_REVEAL_WAIT_BLOCKS, type DuskDomainTxState } from '../../names/internal'
import {
  walletSetupActionCopy,
  walletSetupActionTitle,
  type WalletConnectionStatus,
} from '../wallet/walletStatus'
import { formatWait } from './registrationCopy'
import { RegistrationWalletSetupCard } from './setup/RegistrationWalletSetupCard'

export function RegistrationReviewStep({
  onRefreshWalletProviders,
  walletDiscoveryRefreshing,
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
  onRefreshWalletProviders: () => Promise<unknown> | void
  walletDiscoveryRefreshing: boolean
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
    ? committed ? commitTxState?.status === 'executed' ? 'Reserved' : 'Request saved' : 'Sign the reservation'
    : walletSetupActionTitle(walletSetupState)
  const actionCopy = walletReady
    ? committed
      ? 'Your reservation is saved in My names.'
      : `You can register about ${formatWait(REGISTRATION_MIN_REVEAL_WAIT_BLOCKS)} after it confirms.`
    : walletSetupActionCopy(walletSetupState)

  if (!walletReady) return <RegistrationWalletSetupCard installUrl={installUrl} onOpenWalletConnection={onOpenWalletConnection} onRefreshWalletProviders={onRefreshWalletProviders} walletDiscoveryRefreshing={walletDiscoveryRefreshing} walletSetupState={walletSetupState} />

  return (
    <div className="register-action">
      <div className="register-action-copy">
        <strong>{actionTitle}</strong>
        <span>{actionCopy}</span>
      </div>
      
        <Button variant={committed ? 'secondary' : 'primary'}
          className="compact"
          loading={commitBusy}
          disabled={!canPrepareCommit || txBusy}
          type="button"
          onClick={() => void onPrepareCommit()}
        >
          {commitBusy ? txStatusCopy(commitTxState?.status, commitTxState?.message) : commitStale ? 'Start again' : committed ? 'Saved' : 'Reserve'}
        </Button>
      {commitTxState ? <TransactionStatusNotice state={commitTxState} /> : null}
    </div>
  )
}
