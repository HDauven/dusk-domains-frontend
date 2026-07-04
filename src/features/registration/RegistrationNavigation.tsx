import { ArrowRight } from 'lucide-react'
import type { RegistrationStepId } from './registrationSteps'

export function RegistrationNavigation({
  canContinue,
  currentStep,
  nextStep,
  onBack,
  onNext,
  previousStep,
}: {
  canContinue: boolean
  currentStep: RegistrationStepId
  nextStep: RegistrationStepId | null
  onBack: () => void
  onNext: (step: RegistrationStepId) => void
  previousStep: RegistrationStepId | null
}) {
  return (
    <div className="registration-nav">
      <button
        className="commit-button"
        type="button"
        onClick={onBack}
      >
        {previousStep ? 'Back' : 'Back to result'}
      </button>
      {nextStep ? (
        <button
          className="primary-button compact"
          disabled={!canContinue}
          type="button"
          onClick={() => onNext(nextStep)}
        >
          Continue
          <ArrowRight size={18} />
        </button>
      ) : (
        <span>{currentStep === 'purchase' ? 'Ready to purchase.' : 'Ready to reserve.'}</span>
      )}
    </div>
  )
}
