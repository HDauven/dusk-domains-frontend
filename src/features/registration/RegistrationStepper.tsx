import { registrationStepDefinitions, type RegistrationStepId } from './registrationSteps'

export function RegistrationStepper({
  activeStep,
}: {
  activeStep: RegistrationStepId
}) {
  const activeIndex = Math.max(
    0,
    registrationStepDefinitions.findIndex((step) => step.id === activeStep),
  )

  return (
    <ol className="registration-stepper" aria-label="Registration steps">
      {registrationStepDefinitions.map((step, index) => {
        const state = index < activeIndex
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
