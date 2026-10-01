import { clampDurationYears } from '../../../app/appConstants'
import { currentBlockHeightFromHealth } from '../../../app/appHelpers'
import {
  updatePendingNameReservationBlock,
  userFacingErrorMessage,
  type PendingNameReservation,
} from '../../../names/internal'
import { clearRegisteredPendingReservations } from '../../registration/clearRegisteredPendingReservations'
import { indexedOwnCommitment } from '../../registration/pendingReservationSync'
import { resetSearchState } from '../searchControllerReset'
import { readReservationPrimaryChoice } from '../../registration/reservationPrimaryChoice'
import type { UseSearchControllerProps } from '../searchControllerTypes'

export async function openPendingReservation(
  props: UseSearchControllerProps,
  reservation: PendingNameReservation,
) {
  const {
    beginNameRead,
    chainId,
    hydrateNameFromIndexer,
    getCurrentBlockHeight,
    indexerClient,
    loadPendingReservations,
    openSearchView,
    setActivityLoading,
    setApiSearchResult,
    setChecked,
    setCommitted,
    setCurrentBlockHeight,
    setDuration,
    setIndexerConfirmation,
    setIndexerError,
    setPreparedCommit,
    setRegistrationCompletion,
    setRegistrationStep,
    setResultView,
  } = props

  openSearchView()
  resetSearchState(props, reservation.name)
  props.setRegisterSetsPrimary(readReservationPrimaryChoice(reservation))
  setDuration(clampDurationYears(reservation.durationYears))
  setChecked(true)
  setResultView('register')
  setRegistrationStep('purchase')
  setCommitted(true)
  setPreparedCommit({
    commitment: reservation.commitment,
    secret: reservation.secret,
    committedBlockHeight: reservation.committedBlockHeight,
    committedTxId: reservation.committedTxId,
  })

  if (!indexerClient) return

  setActivityLoading(true)
  setIndexerError('')
  setIndexerConfirmation('')

  const isCurrent = beginNameRead()
  try {
    const [nextResult, health, indexedCommit] = await Promise.all([
      indexerClient.searchName(reservation.name),
      indexerClient.getHealth(),
      indexedOwnCommitment(indexerClient, reservation.commitment, reservation.controller),
    ])
    if (!isCurrent()) return
    setApiSearchResult(nextResult)
    await hydrateNameFromIndexer(indexerClient, nextResult, isCurrent)
    if (!isCurrent()) return

    if (nextResult.status === 'registered') {
      clearRegisteredPendingReservations({
        canonicalName: nextResult.canonical,
        chainId,
        loadPendingReservations,
      })
      setCommitted(false)
      setPreparedCommit(null)
      setRegistrationCompletion(null)
      setRegistrationStep('review')
      setResultView('details')
      setIndexerConfirmation('Registration is complete.')
      return
    }

    const nextBlockHeight = currentBlockHeightFromHealth(health) ?? await getCurrentBlockHeight()
    if (!isCurrent()) return
    const committedBlockHeight = indexedCommit?.committedBlockHeight ?? reservation.committedBlockHeight
    const committedTxId = indexedCommit?.committedTxId ?? reservation.committedTxId

    setCurrentBlockHeight(nextBlockHeight)
    setPreparedCommit({
      commitment: reservation.commitment,
      secret: reservation.secret,
      committedBlockHeight,
      committedTxId,
    })

    if (committedBlockHeight !== reservation.committedBlockHeight || committedTxId !== reservation.committedTxId) {
      updatePendingNameReservationBlock({
        chainId: reservation.chainId,
        controller: reservation.controller,
        commitment: reservation.commitment,
      }, {
        committedBlockHeight,
        committedTxId,
      })
      loadPendingReservations()
    }
  } catch (error) {
    if (isCurrent()) setIndexerError(userFacingErrorMessage(error))
  } finally {
    if (isCurrent()) setActivityLoading(false)
  }
}
