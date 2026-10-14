import { safeNumber } from '../../names/numbers'
import { completeRegistration } from './completeRegistrationAction'
import { prepareRegistrationCommit } from './prepareRegistrationCommit'
import type { UseRegistrationActionsProps } from './registrationActionTypes'
import { restartStrandedReservation } from './strandedReservation'
import type { PrimaryShown } from './walletPrimary'

export function useRegistrationActions(props: UseRegistrationActionsProps) {
  return {
    handlePrepareCommit: () => prepareRegistrationCommit(props),
    handleRegisterName: (confirmedTotalLux?: number, shown?: PrimaryShown) => completeRegistration(props, confirmedTotalLux, shown),
    // Register at the new price: it becomes the reservation's price and the same reservation is revealed.
    handleConfirmNewPrice: async (shown?: PrimaryShown) => {
      const change = props.priceChange
      if (!change || change.commitment !== props.preparedCommit?.commitment) return
      await completeRegistration(props, safeNumber(change.quote.total_lux), shown, change.quote)
    },
    handleRestartReservation: () => restartStrandedReservation(props),
  }
}
