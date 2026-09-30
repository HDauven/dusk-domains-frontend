import { RegistrationPurchaseStep } from '../RegistrationPurchaseStep'
import { RegistrationReviewStep } from '../RegistrationReviewStep'
import { RegistrationSetupStep } from '../RegistrationSetupStep'
import type { RegistrationStepPanelProps } from './types'

export function RegistrationStepPanel(props: RegistrationStepPanelProps) {
  if (props.registrationStep === 'setup') {
    return (
      <RegistrationSetupStep
        canRegister={props.canRegister}
        displayName={props.displayName}
        installUrl={props.installUrl}
        onAddressInputChange={props.onAddressInputChange}
        onOpenWalletConnection={props.onOpenWalletConnection}
        onRefreshWalletProviders={props.onRefreshWalletProviders}
        onRegisterSetsPrimaryChange={props.onRegisterSetsPrimaryChange}
        onUseWalletAddress={props.onUseWalletAddress}
        registerSetsPrimary={props.registerSetsPrimary}
        registrationAddressInput={props.registrationAddressInput}
        registrationTargetAddressErrors={props.registrationTargetAddressErrors}
        selectedAddress={props.selectedAddress}
        walletDiscoveryRefreshing={props.walletDiscoveryRefreshing}
        walletSetupState={props.walletSetupState}
      />
    )
  }

  if (props.registrationStep === 'review') {
    return (
      <RegistrationReviewStep
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
