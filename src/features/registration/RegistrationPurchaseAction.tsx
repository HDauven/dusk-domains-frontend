import { ArrowRight } from 'lucide-react'
import { TransactionStatusNotice } from '../../components/status/TransactionStatusNotice'
import type { DuskNameTxState } from '../../names/internal'
import {
  walletSetupActionCopy,
  walletSetupActionTitle,
  type WalletConnectionStatus,
} from '../wallet/walletStatus'
import {
  commitWindowCopy,
  completeRegistrationButtonCopy,
} from './registrationCopy'
import type { RegistrationCompletionState } from './registrationCompletionState'
import { RegistrationWalletActionButton } from './RegistrationWalletActionButton'
import { RegistrationCompletionProgress } from './RegistrationCompletionProgress'
import type { CommitWindow } from './flow/types'

export function RegistrationPurchaseAction({
  canRevealRegistration,
  commitWindow,
  installUrl,
  onOpenWalletConnection,
  onRegisterName,
  onSetAddress,
  registrationCompletion,
  txBusy,
  txState,
  walletSetupState,
}: {
  canRevealRegistration: boolean
  commitWindow: CommitWindow
  installUrl: string
  onOpenWalletConnection: () => void
  onRegisterName: () => void
  onSetAddress: () => void
  registrationCompletion: RegistrationCompletionState | null
  txBusy: boolean
  txState: DuskNameTxState | null
  walletSetupState: WalletConnectionStatus
}) {
  const walletReady = walletSetupState === 'connected'
  const actionTitle = walletReady
    ? commitWindow.status === 'ready' ? 'Complete purchase' : 'Waiting for reveal window'
    : walletSetupActionTitle(walletSetupState)
  const actionCopy = walletReady
    ? commitWindowCopy(commitWindow.status, commitWindow.waitBlocks, commitWindow.staleInBlocks)
    : walletSetupActionCopy(walletSetupState)

  return (
    <div className="step-action-card purchase-action-card">
      <div>
        <strong>{actionTitle}</strong>
        <span>{actionCopy}</span>
      </div>
      {walletReady ? (
        <button
          className="primary-button register"
          disabled={!canRevealRegistration}
          type="button"
          onClick={() => void onRegisterName()}
        >
          {completeRegistrationButtonCopy(registrationCompletion, txBusy, txState, commitWindow.status, commitWindow.waitBlocks)}
          <ArrowRight size={23} />
        </button>
      ) : (
        <RegistrationWalletActionButton
          className="primary-button register"
          installUrl={installUrl}
          onOpenWalletConnection={onOpenWalletConnection}
          walletSetupState={walletSetupState}
        />
      )}

      {registrationCompletion ? (
        <RegistrationCompletionProgress
          progress={registrationCompletion}
          onSetAddress={onSetAddress}
        />
      ) : txState ? (
        <TransactionStatusNotice state={txState} />
      ) : null}
    </div>
  )
}
