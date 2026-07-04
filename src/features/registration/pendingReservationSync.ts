import type { Dispatch, SetStateAction } from 'react'
import { currentBlockHeightFromHealth } from '../../app/appHelpers'
import {
  currentUnixSeconds,
  updatePendingNameReservationBlock,
  type DuskNamesIndexerClient,
  type PendingNameReservation,
} from '../../names/internal'
import type { PreparedRegistrationCommit } from './pendingReservationTypes'

type RefreshCommitBlockStateArgs = {
  chainId: string
  commitment: string
  indexerClient: DuskNamesIndexerClient
  loadPendingReservations: () => PendingNameReservation[]
  selectedAuthority: string
  setCurrentBlockHeight: (height: number | null) => void
  setPreparedCommit: Dispatch<SetStateAction<PreparedRegistrationCommit | null>>
}

export async function refreshCommitBlockStateFromIndexer({
  chainId,
  commitment,
  indexerClient,
  loadPendingReservations,
  selectedAuthority,
  setCurrentBlockHeight,
  setPreparedCommit,
}: RefreshCommitBlockStateArgs) {
  const [health, indexedCommit] = await Promise.all([
    indexerClient.getHealth(),
    indexerClient.getCommitment(commitment),
  ])
  const nextBlockHeight = currentBlockHeightFromHealth(health)
  setCurrentBlockHeight(nextBlockHeight)

  if (indexedCommit?.committedBlockHeight === null || indexedCommit?.committedBlockHeight === undefined) {
    return false
  }

  setPreparedCommit((current) => {
    if (!current || current.commitment !== commitment) return current
    const nextTxId = indexedCommit.committedTxId ?? current.committedTxId
    if (
      current.committedBlockHeight === indexedCommit.committedBlockHeight &&
      current.committedTxId === nextTxId
    ) {
      return current
    }
    return {
      ...current,
      committedBlockHeight: indexedCommit.committedBlockHeight,
      committedTxId: nextTxId,
    }
  })

  if (selectedAuthority) {
    updatePendingNameReservationBlock({
      chainId,
      controller: selectedAuthority,
      commitment,
    }, {
      committedBlockHeight: indexedCommit.committedBlockHeight,
      committedTxId: indexedCommit.committedTxId ?? null,
    })
    loadPendingReservations()
  }

  return true
}

type RefreshPendingReservationsArgs = {
  indexerClient: DuskNamesIndexerClient
  loadPendingReservations: () => PendingNameReservation[]
  pendingReservations: PendingNameReservation[]
  setCurrentBlockHeight: (height: number | null) => void
  setNowSeconds: (seconds: number) => void
}

export async function refreshPendingReservationsFromIndexer({
  indexerClient,
  loadPendingReservations,
  pendingReservations,
  setCurrentBlockHeight,
  setNowSeconds,
}: RefreshPendingReservationsArgs) {
  const health = await indexerClient.getHealth()
  setCurrentBlockHeight(currentBlockHeightFromHealth(health))
  setNowSeconds(currentUnixSeconds())

  const indexedReservations = await Promise.all(pendingReservations.map(async (reservation) => {
    try {
      return {
        reservation,
        indexedCommit: await indexerClient.getCommitment(reservation.commitment),
      }
    } catch {
      return {
        reservation,
        indexedCommit: null,
      }
    }
  }))

  let changed = false
  for (const { reservation, indexedCommit } of indexedReservations) {
    const committedBlockHeight = indexedCommit?.committedBlockHeight ?? reservation.committedBlockHeight
    const committedTxId = indexedCommit?.committedTxId ?? reservation.committedTxId

    if (
      committedBlockHeight === reservation.committedBlockHeight &&
      committedTxId === reservation.committedTxId
    ) {
      continue
    }

    changed = true
    updatePendingNameReservationBlock({
      chainId: reservation.chainId,
      controller: reservation.controller,
      commitment: reservation.commitment,
    }, {
      committedBlockHeight,
      committedTxId,
    })
  }

  if (changed) loadPendingReservations()
  return changed
}
