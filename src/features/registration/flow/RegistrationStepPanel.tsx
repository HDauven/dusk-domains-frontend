import { RegistrationDurationStep } from '../RegistrationDurationStep'
import { RegistrationPurchaseStep } from '../RegistrationPurchaseStep'
import { RegistrationReviewStep } from '../RegistrationReviewStep'
import { RegistrationSetupStep } from '../RegistrationSetupStep'
import type { RegistrationStepPanelProps } from './types'

export function RegistrationStepPanel({
  activeReferral,
  appliedReferral,
  canPrepareCommit,
  canRegister,
  canRevealRegistration,
  commitBusy,
  commitStale,
  commitTxState,
  commitWindow,
  committed,
  displayName,
  duration,
  expiryDate,
  feeConfigError,
  feeConfigLoading,
  installUrl,
  maxDurationYears,
  minDurationYears,
  networkFee,
  onAddressInputChange,
  onDurationChange,
  onOpenWalletConnection,
  onPrepareCommit,
  onRefreshWalletProviders,
  onRegisterName,
  onRegisterSetsPrimaryChange,
  onSetAddress,
  onUseWalletAddress,
  registerSetsPrimary,
  registrationAddressInput,
  registrationCompletion,
  registrationFee,
  registrationStep,
  registrationTargetAddress,
  registrationTargetAddressErrors,
  selectedAddress,
  total,
  txBusy,
  txState,
  walletDiscoveryRefreshing,
  walletSetupState,
}: RegistrationStepPanelProps) {
  return (
    <div className="registration-step-panel">
      {registrationStep === 'duration' ? (
        <RegistrationDurationStep
          canRegister={canRegister}
          duration={duration}
          expiryDate={expiryDate}
          feeConfigError={feeConfigError}
          feeConfigLoading={feeConfigLoading}
          maxDurationYears={maxDurationYears}
          minDurationYears={minDurationYears}
          onDurationChange={onDurationChange}
          registrationFee={registrationFee}
        />
      ) : null}

      {registrationStep === 'setup' ? (
        <RegistrationSetupStep
          canRegister={canRegister}
          displayName={displayName}
          installUrl={installUrl}
          onAddressInputChange={onAddressInputChange}
          onOpenWalletConnection={onOpenWalletConnection}
          onRefreshWalletProviders={onRefreshWalletProviders}
          onRegisterSetsPrimaryChange={onRegisterSetsPrimaryChange}
          onUseWalletAddress={onUseWalletAddress}
          registerSetsPrimary={registerSetsPrimary}
          registrationAddressInput={registrationAddressInput}
          registrationTargetAddressErrors={registrationTargetAddressErrors}
          selectedAddress={selectedAddress}
          walletDiscoveryRefreshing={walletDiscoveryRefreshing}
          walletSetupState={walletSetupState}
        />
      ) : null}

      {registrationStep === 'review' ? (
        <RegistrationReviewStep
          canPrepareCommit={canPrepareCommit}
          commitBusy={commitBusy}
          commitStale={commitStale}
          commitTxState={commitTxState}
          committed={committed}
          displayName={displayName}
          duration={duration}
          installUrl={installUrl}
          onOpenWalletConnection={onOpenWalletConnection}
          onPrepareCommit={onPrepareCommit}
          registerSetsPrimary={registerSetsPrimary}
          registrationTargetAddress={registrationTargetAddress}
          selectedAddress={selectedAddress}
          txBusy={txBusy}
          walletSetupState={walletSetupState}
        />
      ) : null}

      {registrationStep === 'purchase' ? (
        <RegistrationPurchaseStep
          activeReferral={activeReferral}
          appliedReferral={appliedReferral}
          canRegister={canRegister}
          canRevealRegistration={canRevealRegistration}
          commitWindow={commitWindow}
          displayName={displayName}
          expiryDate={expiryDate}
          feeConfigError={feeConfigError}
          installUrl={installUrl}
          networkFee={networkFee}
          onOpenWalletConnection={onOpenWalletConnection}
          onRegisterName={onRegisterName}
          onSetAddress={onSetAddress}
          registerSetsPrimary={registerSetsPrimary}
          registrationCompletion={registrationCompletion}
          registrationFee={registrationFee}
          registrationTargetAddress={registrationTargetAddress}
          selectedAddress={selectedAddress}
          total={total}
          txBusy={txBusy}
          txState={txState}
          walletSetupState={walletSetupState}
        />
      ) : null}
    </div>
  )
}
