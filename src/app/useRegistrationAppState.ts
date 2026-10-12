import { useScopedState } from '../utils/useScopedState'
import { clampDurationYears } from './appConstants'
import { readReservationPrimaryChoice } from '../features/registration/reservationPrimaryChoice'
import type { PendingNameReservation } from '../names/internal'
import { useCallback, useState } from 'react'
import type { DuskDomainTxState } from '../names/internal'
import type { RegistrationCompletionState } from '../features/registration/registrationCompletionState'
import type { RegistrationStepId } from '../features/registration/registrationSteps'
import type { StrandedCommitment } from '../features/registration/pendingReservationTypes'
import type { RegistrationPriceReview } from '../features/registration/reservationQuote'
import type { PreparedRegistrationCommit } from '../features/registration/usePendingReservations'

/** `address` is the connected wallet's address, which a primary-name choice belongs to. */
export function useRegistrationAppState(sessionKey = '', address = '') {
  const [duration, setDuration] = useState(1)
  // Null until someone chooses: the claim then follows the wallet's primary name (see claimSetsPrimary),
  // read again when it registers (see revealSetsPrimary). A default is never kept as a choice.
  // A choice belongs to the address it was made for. Another account starts from its own default,
  // while a lock and unlock or a reconnect of the same account, which start a new session, keep it.
  const [primaryChoice, setPrimaryChoice] = useState<{ address: string; value: boolean } | null>(null)
  const registerSetsPrimary = primaryChoice?.address === address ? primaryChoice.value : null
  const setRegisterSetsPrimary = useCallback((value: boolean | null) => setPrimaryChoice(value === null ? null : { address, value }), [address])
  const [registrationStep, setRegistrationStep] = useState<RegistrationStepId>('review')
  const [committed, setCommitted] = useScopedState(sessionKey, false)
  const [preparedCommit, setPreparedCommit] = useScopedState<PreparedRegistrationCommit | null>(sessionKey, null)
  const [txState, setTxState] = useScopedState<DuskDomainTxState | null>(sessionKey, null)
  const [commitTxState, setCommitTxState] = useScopedState<DuskDomainTxState | null>(sessionKey, null)
  const [registrationCompletion, setRegistrationCompletion] = useScopedState<RegistrationCompletionState | null>(sessionKey, null)
  // Register was pressed on a saved reservation: sign the reveal once this claim is ready.
  const [registerIntent, setRegisterIntent] = useScopedState<{ commitment: string, requestedAt: number } | null>(sessionKey, null)
  // The registration price changed since it was shown or reserved; Register waits for the new one.
  const [priceChange, setPriceChange] = useScopedState<RegistrationPriceReview | null>(sessionKey, null)
  // A saved commitment the reveal would not find on chain; see revealCommitmentMissing.
  const [strandedCommitment, setStrandedCommitment] = useState<StrandedCommitment | null>(null)

  return {
    searchActions: {
      reset: () => {
        setCommitted(false)
        setPreparedCommit(null)
        setRegisterSetsPrimary(null)
        setRegistrationStep('review')
        setTxState(null)
        setCommitTxState(null)
        setRegistrationCompletion(null)
        setRegisterIntent(null)
        setPriceChange(null)
      },
      review: () => setRegistrationStep('review'),
      resume: (reservation: PendingNameReservation, options: { register?: boolean } = {}) => {
        // An older reservation may not have saved its owner; it resumes for the connected wallet.
        // Without a saved choice, the claim follows the wallet's primary name again.
        const saved = readReservationPrimaryChoice(reservation)
        setPrimaryChoice(saved === null ? null : { address: reservation.ownerAddress || address, value: saved })
        setDuration(clampDurationYears(reservation.durationYears))
        setRegistrationStep('purchase')
        setCommitted(true)
        setRegisterIntent(options.register ? { commitment: reservation.commitment, requestedAt: Date.now() } : null)
        setPriceChange(null)
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
        setPriceChange(null)
      },
      updateCommit: (commit: PreparedRegistrationCommit) => setPreparedCommit(current => current?.commitment === commit.commitment
        && current.controller === commit.controller && current.ownerAddress === commit.ownerAddress && current.chainId === commit.chainId ? commit : current),
    },
    commitTxState,
    committed,
    duration,
    preparedCommit,
    priceChange,
    registerIntent,
    registerSetsPrimary,
    registrationCompletion,
    registrationStep,
    setCommitTxState,
    setCommitted,
    setDuration,
    setPreparedCommit,
    setPriceChange,
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
