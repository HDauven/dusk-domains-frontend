import { Check } from 'lucide-react'
import { registrationStepDefinitions, type RegistrationStepId } from './registrationSteps'

export function RegistrationStepper({
  activeStep,
  complete = false,
}: {
  activeStep: RegistrationStepId
  complete?: boolean
}) {
  const activeIndex = Math.max(0, registrationStepDefinitions.findIndex((step) => step.id === activeStep))

  return (
    <ol className="register-stepper" aria-label="Registration steps">
      {registrationStepDefinitions.map((step, index) => {
        const state = complete || index < activeIndex ? 'complete' : index === activeIndex ? 'active' : 'pending'
        return (
          <li className={state} key={step.id} aria-current={state === 'active' ? 'step' : undefined}>
            <span className="register-stepper-dot">{state === 'complete' ? <Check size={13} strokeWidth={3} /> : index + 1}</span>
            <span className="register-stepper-label">{step.label}</span>
          </li>
        )
      })}
    </ol>
  )
}
