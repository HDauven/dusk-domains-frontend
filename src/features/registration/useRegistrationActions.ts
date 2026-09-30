import { completeRegistration } from './completeRegistrationAction'
import { prepareRegistrationCommit } from './prepareRegistrationCommit'
import type { UseRegistrationActionsProps } from './registrationActionTypes'
import { restartStrandedReservation } from './strandedReservation'

export function useRegistrationActions(props: UseRegistrationActionsProps) {
  return {
    handlePrepareCommit: () => prepareRegistrationCommit(props),
    handleRegisterName: () => completeRegistration(props),
    handleRestartReservation: () => restartStrandedReservation(props),
  }
}
