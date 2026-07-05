import { registrationStepDefinitions, type RegistrationStepId } from './registrationSteps'

export function RegistrationStepper({
  activeStep,
  complete = false,
}: {
  activeStep: RegistrationStepId
  complete?: boolean
}) {
  const activeIndex = Math.max(
    0,
    registrationStepDefinitions.findIndex((step) => step.id === activeStep),
  )

  return (
    <ol className="registration-stepper" aria-label="Registration steps">
      {registrationStepDefinitions.map((step, index) => {
        const state = complete
          ? 'complete'
          : index < activeIndex
          ? 'complete'
          : index === activeIndex
            ? 'active'
            : 'pending'

        return (
          <li className={state} key={step.id}>
            <strong>{step.label}</strong>
          </li>
        )
      })}
    </ol>
  )
}
