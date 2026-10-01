import { Panel } from '../../components/ui/Panel'
import { RegistrationStepPanel } from './flow/RegistrationStepPanel'
import type { RegistrationFlowPanelProps } from './flow/types'
import { RegistrationFlowStatus } from './RegistrationFlowStatus'
import { RegistrationPolicyNotes } from './RegistrationPolicyNotes'
import { RegistrationSummary } from './RegistrationSummary'
import { ClaimSuccess } from './ClaimSuccess'

export function RegistrationFlowPanel({ navigation, resultIssues, status, step, wizard }: RegistrationFlowPanelProps) {
  if (wizard.registrationComplete) return <ClaimSuccess name={wizard.displayName} onOpen={step.onSetAddress} onAddRecords={step.onAddRecords} progress={step.registrationCompletion} />
  return (
    <Panel className="claim-card register-card" aria-labelledby="register-heading">
      <div className="claim-main register-main">
        <header className="register-head">
          <p className="register-stage">{wizard.registrationStep === 'purchase' ? '2 of 2 · Register' : '1 of 2 · Reserve'}</p>
          <h1 id="register-heading">{wizard.displayName}</h1>
        </header>
        <RegistrationStepPanel {...step} />
        <RegistrationPolicyNotes issues={resultIssues} />
        <RegistrationFlowStatus {...status} />
      </div>
      <RegistrationSummary
        activeReferral={step.activeReferral} appliedReferral={step.appliedReferral} committed={step.committed}
        displayName={step.displayName} duration={step.duration} expiryDate={step.expiryDate}
        feeConfigError={step.feeConfigError} onChangeTerm={navigation.onBackToOverview}
        onRegisterSetsPrimaryChange={step.onRegisterSetsPrimaryChange}
        registerSetsPrimary={step.registerSetsPrimary} registrationComplete={false}
        registrationFee={step.registrationFee} registrationTargetAddress={step.registrationTargetAddress} selectedAddress={step.selectedAddress}
      />
    </Panel>
  )
}

export type { RegistrationFlowPanelProps } from './flow/types'
