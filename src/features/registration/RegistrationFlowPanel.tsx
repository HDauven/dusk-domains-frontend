import { Panel } from '../../components/ui/Panel'
import { RegistrationStepPanel } from './flow/RegistrationStepPanel'
import type { RegistrationFlowPanelProps } from './flow/types'
import { RegistrationFlowStatus } from './RegistrationFlowStatus'
import { RegistrationNavigation } from './RegistrationNavigation'
import { RegistrationPolicyNotes } from './RegistrationPolicyNotes'
import { RegistrationStepper } from './RegistrationStepper'
import { RegistrationSummary } from './RegistrationSummary'
import { registrationStepDefinitions } from './registrationSteps'

// The claim, step by step: the current step on the left, what is being bought on the right.
export function RegistrationFlowPanel({
  navigation,
  resultIssues,
  status,
  step,
  wizard,
}: RegistrationFlowPanelProps) {
  const definition = registrationStepDefinitions.find(({ id }) => id === wizard.registrationStep) ?? registrationStepDefinitions[0]
  const title = wizard.registrationComplete ? `${wizard.displayName} is yours` : definition.title

  return (
    <Panel className="claim-card register-card" aria-labelledby="register-heading">
      <div className="claim-main register-main">
        <RegistrationStepper activeStep={wizard.registrationStep} complete={wizard.registrationComplete} />

        <header className="register-head">
          <h2 id="register-heading">{title}</h2>
          <p>{wizard.registrationStepDescription}</p>
        </header>

        <RegistrationStepPanel {...step} />

        <RegistrationPolicyNotes issues={resultIssues} />

        <RegistrationFlowStatus
          onViewPendingReservation={status.onViewPendingReservation}
          showReservationRecovery={status.showReservationRecovery}
          walletError={status.walletError}
        />

        <RegistrationNavigation
          canContinue={navigation.canContinueRegistrationStep}
          nextStep={navigation.registrationNextStep}
          onBack={() => {
            if (navigation.registrationPreviousStep) {
              navigation.onStepChange(navigation.registrationPreviousStep)
            } else {
              navigation.onBackToOverview()
            }
          }}
          onNext={navigation.onStepChange}
          registrationComplete={navigation.registrationComplete}
        />
      </div>

      <RegistrationSummary
        activeReferral={step.activeReferral}
        appliedReferral={step.appliedReferral}
        committed={step.committed}
        displayName={step.displayName}
        duration={step.duration}
        expiryDate={step.registrationCompletion?.summary?.expiryDate ?? step.expiryDate}
        feeConfigError={step.feeConfigError}
        onChangeTerm={navigation.onBackToOverview}
        registerSetsPrimary={step.registerSetsPrimary}
        registrationComplete={wizard.registrationComplete}
        registrationFee={step.registrationCompletion?.summary?.registrationFee ?? step.registrationFee}
        registrationTargetAddress={step.registrationTargetAddress}
        selectedAddress={step.selectedAddress}
      />
    </Panel>
  )
}

export type { RegistrationFlowPanelProps } from './flow/types'
