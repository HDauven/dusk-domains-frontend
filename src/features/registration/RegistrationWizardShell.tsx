import type { ReactNode } from 'react'
import { RegistrationStepper } from './RegistrationStepper'
import type { RegistrationStepId } from './registrationSteps'

type RegistrationWizardShellProps = {
  activeStep: RegistrationStepId
  children: ReactNode
  description: string
  displayName: string
}

export function RegistrationWizardShell({
  activeStep,
  children,
  description,
  displayName,
}: RegistrationWizardShellProps) {
  return (
    <div className="registration-layout">
      <section className="name-panel registration-wizard" aria-labelledby="register-heading">
        <div className="registration-heading">
          <div>
            <h2 id="register-heading">{displayName}</h2>
            <p className="intro">{description}</p>
          </div>
        </div>

        <RegistrationStepper activeStep={activeStep} />

        {children}
      </section>
    </div>
  )
}
