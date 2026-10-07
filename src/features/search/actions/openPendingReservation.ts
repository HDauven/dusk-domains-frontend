import { currentBlockHeightFromHealth } from '../../../app/indexerReadHelpers'
import {
  updatePendingNameReservationBlock,
  userFacingErrorMessage,
  type PendingNameReservation,
} from '../../../names/internal'
import { clearRegisteredPendingReservations } from '../../registration/clearRegisteredPendingReservations'
import { indexedOwnCommitment } from '../../registration/pendingReservationSync'
import { resetSearchState } from '../searchControllerReset'
import type { UseSearchControllerProps } from '../searchControllerTypes'

export async function openPendingReservation(
  props: UseSearchControllerProps,
  reservation: PendingNameReservation,
) {
  const { beginNameRead, chainId, hydrateNameFromIndexer, getCurrentBlockHeight, indexerClient,
    loadPendingReservations, openSearchView, search, registration, activity } = props

  openSearchView()
  resetSearchState(props, reservation.name)
  search.open('register')
  registration.resume(reservation)

  if (!indexerClient) return

  activity.startLoading()
  search.startRead()

  const isCurrent = beginNameRead()
  try {
    const [nextResult, health, indexedCommit] = await Promise.all([
      indexerClient.searchName(reservation.name),
      indexerClient.getHealth(),
      indexedOwnCommitment(indexerClient, reservation.commitment, reservation.controller),
    ])
    if (!isCurrent()) return
    search.showResult(nextResult)
    await hydrateNameFromIndexer(indexerClient, nextResult, isCurrent)
    if (!isCurrent()) return

    if (nextResult.status === 'registered') {
      clearRegisteredPendingReservations({
        canonicalName: nextResult.canonical,
        chainId,
        loadPendingReservations,
      })
      registration.clearCompleted()
      registration.review()
      search.showView('details')
      search.confirm('Registration is complete.')
      return
    }

    const nextBlockHeight = currentBlockHeightFromHealth(health) ?? await getCurrentBlockHeight()
    if (!isCurrent()) return
    const committedBlockHeight = indexedCommit?.committedBlockHeight ?? reservation.committedBlockHeight
    const committedTxId = indexedCommit?.committedTxId ?? reservation.committedTxId

    search.updateClock(nextBlockHeight)
    registration.updateCommit({
      directory: reservation.directory,
      commitmentStore: reservation.commitmentStore,
      controller: reservation.controller,
      ownerAddress: reservation.ownerAddress,
      chainId: reservation.chainId,
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
    if (isCurrent()) search.fail(userFacingErrorMessage(error))
  } finally {
    if (isCurrent()) activity.finishLoading()
  }
}
