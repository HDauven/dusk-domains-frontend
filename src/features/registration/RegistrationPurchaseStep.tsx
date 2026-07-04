import type { DuskNameTxState } from '../../names/internal'
import type { ReferralState } from '../referrals/referralState'
import type { WalletConnectionStatus } from '../wallet/walletStatus'
import type { CommitWindow } from './flow/types'
import type { RegistrationCompletionState } from './registrationCompletionState'
import { RegistrationPurchaseAction } from './RegistrationPurchaseAction'
import { RegistrationPurchaseChecklist } from './RegistrationPurchaseChecklist'
import { RegistrationPurchaseSummary } from './RegistrationPurchaseSummary'

export function RegistrationPurchaseStep({
  activeReferral,
  appliedReferral,
  canRegister,
  canRevealRegistration,
  commitWindow,
  displayName,
  expiryDate,
  feeConfigError,
  installUrl,
  networkFee,
  onOpenWalletConnection,
  onRegisterName,
  onSetAddress,
  registerSetsPrimary,
  registrationCompletion,
  registrationFee,
  registrationTargetAddress,
  selectedAddress,
  total,
  txBusy,
  txState,
  walletSetupState,
}: {
  activeReferral: ReferralState | null
  appliedReferral: ReferralState | null
  canRegister: boolean
  canRevealRegistration: boolean
  commitWindow: CommitWindow
  displayName: string
  expiryDate: string
  feeConfigError: string
  installUrl: string
  networkFee: number
  onOpenWalletConnection: () => void
  onRegisterName: () => void
  onSetAddress: () => void
  registerSetsPrimary: boolean
  registrationCompletion: RegistrationCompletionState | null
  registrationFee: number
  registrationTargetAddress: string
  selectedAddress: string
  total: number
  txBusy: boolean
  txState: DuskNameTxState | null
  walletSetupState: WalletConnectionStatus
}) {
  return (
    <div className="registration-review">
      <RegistrationPurchaseSummary
        activeReferral={activeReferral}
        appliedReferral={appliedReferral}
        canRegister={canRegister}
        commitWindow={commitWindow}
        displayName={displayName}
        expiryDate={expiryDate}
        feeConfigError={feeConfigError}
        networkFee={networkFee}
        registerSetsPrimary={registerSetsPrimary}
        registrationFee={registrationFee}
        registrationTargetAddress={registrationTargetAddress}
        selectedAddress={selectedAddress}
        total={total}
      />

      <RegistrationPurchaseChecklist commitWindow={commitWindow} />

      <RegistrationPurchaseAction
        canRevealRegistration={canRevealRegistration}
        commitWindow={commitWindow}
        installUrl={installUrl}
        onOpenWalletConnection={onOpenWalletConnection}
        onRegisterName={onRegisterName}
        onSetAddress={onSetAddress}
        registrationCompletion={registrationCompletion}
        txBusy={txBusy}
        txState={txState}
        walletSetupState={walletSetupState}
      />
    </div>
  )
}
