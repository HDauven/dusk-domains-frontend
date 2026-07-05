import { useState } from 'react'
import type { DuskDomainTxState } from '../names/internal'
import type { RegistrationCompletionState } from '../features/registration/registrationCompletionState'
import type { RegistrationStepId } from '../features/registration/registrationSteps'
import type { PreparedRegistrationCommit } from '../features/registration/usePendingReservations'

export function useRegistrationAppState() {
  const [duration, setDuration] = useState(1)
  const [registerSetsPrimary, setRegisterSetsPrimary] = useState(true)
  const [registrationAddressInput, setRegistrationAddressInput] = useState('')
  const [registrationStep, setRegistrationStep] = useState<RegistrationStepId>('duration')
  const [committed, setCommitted] = useState(false)
  const [preparedCommit, setPreparedCommit] = useState<PreparedRegistrationCommit | null>(null)
  const [txState, setTxState] = useState<DuskDomainTxState | null>(null)
  const [commitTxState, setCommitTxState] = useState<DuskDomainTxState | null>(null)
  const [registrationCompletion, setRegistrationCompletion] = useState<RegistrationCompletionState | null>(null)

  return {
    commitTxState,
    committed,
    duration,
    preparedCommit,
    registerSetsPrimary,
    registrationAddressInput,
    registrationCompletion,
    registrationStep,
    setCommitTxState,
    setCommitted,
    setDuration,
    setPreparedCommit,
    setRegisterSetsPrimary,
    setRegistrationAddressInput,
    setRegistrationCompletion,
    setRegistrationStep,
    setTxState,
    txState,
  }
}
