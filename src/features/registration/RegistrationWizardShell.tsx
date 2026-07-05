import type { ReactNode } from 'react'
import { RegistrationStepper } from './RegistrationStepper'
import type { RegistrationStepId } from './registrationSteps'

type RegistrationWizardShellProps = {
  activeStep: RegistrationStepId
  children: ReactNode
  complete: boolean
  description: string
  displayName: string
}

export function RegistrationWizardShell({
  activeStep,
  children,
  complete,
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

        <RegistrationStepper activeStep={activeStep} complete={complete} />

        {children}
      </section>
    </div>
  )
}
