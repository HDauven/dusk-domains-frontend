import { completeRegistration } from './completeRegistrationAction'
import { prepareRegistrationCommit } from './prepareRegistrationCommit'
import type { UseRegistrationActionsProps } from './registrationActionTypes'
import { restartStrandedReservation } from './strandedReservation'
import type { PrimaryShown } from './walletPrimary'

export function useRegistrationActions(props: UseRegistrationActionsProps) {
  return {
    handlePrepareCommit: () => prepareRegistrationCommit(props),
    handleRegisterName: (confirmedTotalLux?: number, shown?: PrimaryShown) => completeRegistration(props, confirmedTotalLux, shown),
    handleRestartReservation: () => restartStrandedReservation(props),
  }
}
