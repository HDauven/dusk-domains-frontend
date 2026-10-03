import { RegistrationPurchaseStep } from '../RegistrationPurchaseStep'
import { RegistrationReviewStep } from '../RegistrationReviewStep'
import type { RegistrationStepPanelProps } from './types'

export function RegistrationStepPanel(props: RegistrationStepPanelProps) {
  if (props.registrationStep !== 'purchase') {
    return (
      <RegistrationReviewStep
        onRefreshWalletProviders={props.onRefreshWalletProviders}
        walletDiscoveryRefreshing={props.walletDiscoveryRefreshing}
        canPrepareCommit={props.canPrepareCommit}
        commitBusy={props.commitBusy}
        commitStale={props.commitStale}
        commitTxState={props.commitTxState}
        committed={props.committed}
        installUrl={props.installUrl}
        onOpenWalletConnection={props.onOpenWalletConnection}
        onPrepareCommit={props.onPrepareCommit}
        txBusy={props.txBusy}
        walletSetupState={props.walletSetupState}
      />
    )
  }

  return (
    <RegistrationPurchaseStep
      canRestartReservation={props.canRestartReservation}
      canRevealRegistration={props.canRevealRegistration}
      commitWindow={props.commitWindow}
      installUrl={props.installUrl}
      onOpenWalletConnection={props.onOpenWalletConnection}
      onRegisterName={props.onRegisterName}
      onWaitForPremium={props.onWaitForPremium}
      premiumConfirmation={props.premiumConfirmation}
      onRestartReservation={props.onRestartReservation}
      onSetAddress={props.onSetAddress}
      registrationCompletion={props.registrationCompletion}
      reservationStranded={props.reservationStranded}
      txBusy={props.txBusy}
      txState={props.txState}
      walletSetupState={props.walletSetupState}
    />
  )
}
