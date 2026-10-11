import { useScopedState } from '../utils/useScopedState'
import { clampDurationYears } from './appConstants'
import { readReservationPrimaryChoice } from '../features/registration/reservationPrimaryChoice'
import type { PendingNameReservation } from '../names/internal'
import { useState } from 'react'
import type { DuskDomainTxState } from '../names/internal'
import type { RegistrationCompletionState } from '../features/registration/registrationCompletionState'
import type { RegistrationStepId } from '../features/registration/registrationSteps'
import type { StrandedCommitment } from '../features/registration/pendingReservationTypes'
import type { PreparedRegistrationCommit } from '../features/registration/usePendingReservations'

export function useRegistrationAppState(sessionKey = '') {
  const [duration, setDuration] = useState(1)
  const [registerSetsPrimary, setRegisterSetsPrimary] = useState(true)
  const [registrationStep, setRegistrationStep] = useState<RegistrationStepId>('review')
  const [committed, setCommitted] = useScopedState(sessionKey, false)
  const [preparedCommit, setPreparedCommit] = useScopedState<PreparedRegistrationCommit | null>(sessionKey, null)
  const [txState, setTxState] = useScopedState<DuskDomainTxState | null>(sessionKey, null)
  const [commitTxState, setCommitTxState] = useScopedState<DuskDomainTxState | null>(sessionKey, null)
  const [registrationCompletion, setRegistrationCompletion] = useScopedState<RegistrationCompletionState | null>(sessionKey, null)
  // Register was pressed on a saved reservation: sign the reveal once this claim is ready.
  const [registerIntent, setRegisterIntent] = useScopedState<{ commitment: string, requestedAt: number } | null>(sessionKey, null)
  // A saved commitment the reveal would not find on chain; see revealCommitmentMissing.
  const [strandedCommitment, setStrandedCommitment] = useState<StrandedCommitment | null>(null)

  return {
    searchActions: {
      reset: () => {
        setCommitted(false)
        setPreparedCommit(null)
        setRegisterSetsPrimary(true)
        setRegistrationStep('review')
        setTxState(null)
        setCommitTxState(null)
        setRegistrationCompletion(null)
        setRegisterIntent(null)
      },
      review: () => setRegistrationStep('review'),
      resume: (reservation: PendingNameReservation, options: { register?: boolean } = {}) => {
        setRegisterSetsPrimary(readReservationPrimaryChoice(reservation))
        setDuration(clampDurationYears(reservation.durationYears))
        setRegistrationStep('purchase')
        setCommitted(true)
        setRegisterIntent(options.register ? { commitment: reservation.commitment, requestedAt: Date.now() } : null)
        // The reveal goes to the store that took the commitment, saved with the reservation.
        setPreparedCommit({
          directory: reservation.directory,
          commitmentStore: reservation.commitmentStore,
          controller: reservation.controller,
          ownerAddress: reservation.ownerAddress,
          chainId: reservation.chainId,
          commitment: reservation.commitment,
          secret: reservation.secret,
          committedBlockHeight: reservation.committedBlockHeight,
          committedTxId: reservation.committedTxId,
        })
      },
      clearCompleted: () => {
        setCommitted(false)
        setPreparedCommit(null)
        setRegistrationCompletion(null)
      },
      updateCommit: (commit: PreparedRegistrationCommit) => setPreparedCommit(current => current?.commitment === commit.commitment
        && current.controller === commit.controller && current.ownerAddress === commit.ownerAddress && current.chainId === commit.chainId ? commit : current),
    },
    commitTxState,
    committed,
    duration,
    preparedCommit,
    registerIntent,
    registerSetsPrimary,
    registrationCompletion,
    registrationStep,
    setCommitTxState,
    setCommitted,
    setDuration,
    setPreparedCommit,
    setRegisterIntent,
    setRegisterSetsPrimary,
    setRegistrationCompletion,
    setRegistrationStep,
    setStrandedCommitment,
    setTxState,
    strandedCommitment,
    txState,
  }
}
