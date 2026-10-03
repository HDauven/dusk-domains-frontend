import { clampDurationYears } from './appConstants'
import { readReservationPrimaryChoice } from '../features/registration/reservationPrimaryChoice'
import type { PendingNameReservation } from '../names/internal'
import { useState } from 'react'
import type { DuskDomainTxState } from '../names/internal'
import type { RegistrationCompletionState } from '../features/registration/registrationCompletionState'
import type { RegistrationStepId } from '../features/registration/registrationSteps'
import type { StrandedCommitment } from '../features/registration/pendingReservationTypes'
import type { PreparedRegistrationCommit } from '../features/registration/usePendingReservations'

export function useRegistrationAppState() {
  const [duration, setDuration] = useState(1)
  const [registerSetsPrimary, setRegisterSetsPrimary] = useState(true)
  const [registrationStep, setRegistrationStep] = useState<RegistrationStepId>('review')
  const [committed, setCommitted] = useState(false)
  const [preparedCommit, setPreparedCommit] = useState<PreparedRegistrationCommit | null>(null)
  const [txState, setTxState] = useState<DuskDomainTxState | null>(null)
  const [commitTxState, setCommitTxState] = useState<DuskDomainTxState | null>(null)
  const [registrationCompletion, setRegistrationCompletion] = useState<RegistrationCompletionState | null>(null)
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
      },
      review: () => setRegistrationStep('review'),
      resume: (reservation: PendingNameReservation) => {
        setRegisterSetsPrimary(readReservationPrimaryChoice(reservation))
        setDuration(clampDurationYears(reservation.durationYears))
        setRegistrationStep('purchase')
        setCommitted(true)
        setPreparedCommit({
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
      updateCommit: (commit: PreparedRegistrationCommit) => setPreparedCommit(commit),
    },
    commitTxState,
    committed,
    duration,
    preparedCommit,
    registerSetsPrimary,
    registrationCompletion,
    registrationStep,
    setCommitTxState,
    setCommitted,
    setDuration,
    setPreparedCommit,
    setRegisterSetsPrimary,
    setRegistrationCompletion,
    setRegistrationStep,
    setStrandedCommitment,
    setTxState,
    strandedCommitment,
    txState,
  }
}
