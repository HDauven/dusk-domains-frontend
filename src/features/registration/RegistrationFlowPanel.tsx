import { RegistrationStepPanel } from './flow/RegistrationStepPanel'
import type { RegistrationFlowPanelProps } from './flow/types'
import { RegistrationFlowStatus } from './RegistrationFlowStatus'
import { RegistrationNavigation } from './RegistrationNavigation'
import { RegistrationPolicyNotes } from './RegistrationPolicyNotes'
import { RegistrationWizardShell } from './RegistrationWizardShell'

export function RegistrationFlowPanel({
  navigation,
  resultIssues,
  status,
  step,
  wizard,
}: RegistrationFlowPanelProps) {
  return (
    <RegistrationWizardShell
      activeStep={wizard.registrationStep}
      complete={wizard.registrationComplete}
      description={wizard.registrationStepDescription}
      displayName={wizard.displayName}
    >
      <RegistrationStepPanel {...step} />

      <RegistrationPolicyNotes issues={resultIssues} />

      <RegistrationNavigation
        canContinue={navigation.canContinueRegistrationStep}
        currentStep={navigation.registrationStep}
        nextStep={navigation.registrationNextStep}
        onBack={() => {
          if (navigation.registrationPreviousStep) {
            navigation.onStepChange(navigation.registrationPreviousStep)
          } else {
            navigation.onBackToOverview()
          }
        }}
        onNext={navigation.onStepChange}
        previousStep={navigation.registrationPreviousStep}
        registrationComplete={navigation.registrationComplete}
      />

      <RegistrationFlowStatus
        onViewPendingReservation={status.onViewPendingReservation}
        showReservationRecovery={status.showReservationRecovery}
        walletError={status.walletError}
      />
    </RegistrationWizardShell>
  )
}

export type { RegistrationFlowPanelProps } from './flow/types'
