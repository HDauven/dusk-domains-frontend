import { Button } from '../../components/ui/Button'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { RegistrationStepId } from './registrationSteps'

export function RegistrationNavigation({
  canContinue,
  nextStep,
  onBack,
  onNext,
  registrationComplete,
}: {
  canContinue: boolean
  nextStep: RegistrationStepId | null
  onBack: () => void
  onNext: (step: RegistrationStepId) => void
  registrationComplete: boolean
}) {
  if (registrationComplete) return null

  return (
    <div className="register-nav">
      <Button variant="quiet" type="button" onClick={onBack}>
        <ArrowLeft size={15} /> Back
      </Button>
      {nextStep ? (
        <Button variant="primary" className="compact" disabled={!canContinue} type="button" onClick={() => onNext(nextStep)}>
          Continue <ArrowRight size={17} />
        </Button>
      ) : null}
    </div>
  )
}
