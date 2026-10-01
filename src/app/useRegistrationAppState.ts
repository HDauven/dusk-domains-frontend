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
