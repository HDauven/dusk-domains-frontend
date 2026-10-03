import { RegistrationPurchaseStep } from '../RegistrationPurchaseStep'
import { RegistrationReviewStep } from '../RegistrationReviewStep'
import type { RegistrationStepPanelProps } from './types'

export function RegistrationStepPanel({ registrationStep, wallet, reservation, purchase, quote }: RegistrationStepPanelProps) {
  if (registrationStep !== 'purchase') {
    return <RegistrationReviewStep wallet={wallet} reservation={reservation} purchase={purchase} />
  }
  return <RegistrationPurchaseStep wallet={wallet} reservation={reservation} purchase={purchase} quote={quote} />
}
