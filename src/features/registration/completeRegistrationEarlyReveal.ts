import {
  isRevealTooEarlyMessage,
  type DuskDomainTxState,
} from '../../names/internal'
import type { UseRegistrationActionsProps } from './registrationActionTypes'

export async function handleCompleteRegistrationEarlyReveal(
  {
    indexerClient,
    preparedCommit,
    refreshCommitBlockState,
    setWalletError,
  }: UseRegistrationActionsProps,
  finalState: DuskDomainTxState,
) {
  if (!isRevealTooEarlyMessage(finalState.message)) return false

  if (indexerClient && preparedCommit) {
    try {
      await refreshCommitBlockState(preparedCommit.commitment)
    } catch {
      // The contract has already told us the reservation is not mature yet.
    }
  }
  setWalletError('Reservation is confirmed, but the reveal block is not ready yet. Try again after a few more blocks.')
  return true
}
