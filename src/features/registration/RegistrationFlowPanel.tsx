import { BrandClaimNotice } from '../search/BrandClaimNotice'
import { NameSignature } from '../../components/ui/NameChip'
import { Panel } from '../../components/ui/Panel'
import { RegistrationStepPanel } from './flow/RegistrationStepPanel'
import type { RegistrationFlowPanelProps } from './flow/types'
import { RegistrationFlowStatus } from './RegistrationFlowStatus'
import { RegistrationPolicyNotes } from './RegistrationPolicyNotes'
import { RegistrationSummary } from './RegistrationSummary'
import { ClaimSuccess } from './ClaimSuccess'

export function RegistrationFlowPanel({ navigation, resultIssues, status, step, wizard }: RegistrationFlowPanelProps) {
  if (wizard.registrationComplete) return <ClaimSuccess name={wizard.displayName} onOpen={step.purchase.onSetAddress} onAddRecords={step.purchase.onAddRecords} progress={step.purchase.registrationCompletion} />
  return (
    <Panel className="claim-card register-card" aria-labelledby="register-heading">
      <div className="claim-main register-main">
        <header className="register-head">
          <p className="register-stage">{wizard.registrationStep === 'purchase' ? '2 of 2 · Register' : '1 of 2 · Reserve'}</p>
          <h1 id="register-heading" aria-label={wizard.displayName}><NameSignature name={wizard.displayName} fit /></h1>
        </header>
        <BrandClaimNotice name={wizard.displayName} />
        <RegistrationStepPanel {...step} />
        <RegistrationPolicyNotes issues={resultIssues} />
        <RegistrationFlowStatus {...status} walletError={step.purchase.registrationCompletion ? '' : status.walletError} />
      </div>
      <RegistrationSummary
        committed={step.reservation.committed}
        registrationComplete={false}
        selectedAddress={step.wallet.selectedAddress}
        quote={{ ...step.quote, onChangeTerm: navigation.onBackToOverview }}
        referral={step.referral}
        primaryChoice={step.primaryChoice}
      />
    </Panel>
  )
}

export type { RegistrationFlowPanelProps } from './flow/types'
