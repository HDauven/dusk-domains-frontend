import { clampDurationYears } from '../../../app/appConstants'
import { currentBlockHeightFromHealth } from '../../../app/appHelpers'
import {
  updatePendingNameReservationBlock,
  userFacingErrorMessage,
  type PendingNameReservation,
} from '../../../names/internal'
import { resetSearchState } from '../searchControllerReset'
import type { UseSearchControllerProps } from '../searchControllerTypes'

export async function openPendingReservation(
  props: UseSearchControllerProps,
  reservation: PendingNameReservation,
) {
  const {
    hydrateNameFromIndexer,
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
    setRegistrationStep,
    setResultView,
  } = props

  openSearchView()
  resetSearchState(props, reservation.name)
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

  try {
    const [nextResult, health, indexedCommit] = await Promise.all([
      indexerClient.searchName(reservation.name),
      indexerClient.getHealth(),
      indexerClient.getCommitment(reservation.commitment),
    ])
    const nextBlockHeight = currentBlockHeightFromHealth(health)
    const committedBlockHeight = indexedCommit?.committedBlockHeight ?? reservation.committedBlockHeight
    const committedTxId = indexedCommit?.committedTxId ?? reservation.committedTxId

    setApiSearchResult(nextResult)
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

    await hydrateNameFromIndexer(indexerClient, nextResult)
  } catch (error) {
    setIndexerError(userFacingErrorMessage(error))
  } finally {
    setActivityLoading(false)
  }
}
