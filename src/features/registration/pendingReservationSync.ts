import type { Dispatch, SetStateAction } from 'react'
import { currentBlockHeightFromHealth } from '../../app/appHelpers'
import type { CurrentBlockHeightReader } from '../../app/duskNodeHeight'
import {
  currentUnixSeconds,
  updatePendingNameReservationBlock,
  type DuskDomainsIndexerClient,
  type PendingNameReservation,
} from '../../names/internal'
import { inferredCommittedBlockHeightFromReservation } from './pendingReservationBlockRecovery'
import type { PreparedRegistrationCommit } from './pendingReservationTypes'

type RefreshCommitBlockStateArgs = {
  chainId: string
  commitment: string
  getCurrentBlockHeight: CurrentBlockHeightReader
  indexerClient: DuskDomainsIndexerClient
  loadPendingReservations: () => PendingNameReservation[]
  selectedAuthority: string
  setCurrentBlockHeight: (height: number | null) => void
  setPreparedCommit: Dispatch<SetStateAction<PreparedRegistrationCommit | null>>
}

export async function refreshCommitBlockStateFromIndexer({
  chainId,
  commitment,
  getCurrentBlockHeight,
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
  const nextBlockHeight = currentBlockHeightFromHealth(health) ?? await getCurrentBlockHeight()
  setCurrentBlockHeight(nextBlockHeight)

  if (indexedCommit?.committedBlockHeight === null || indexedCommit?.committedBlockHeight === undefined) {
    const savedReservation = loadPendingReservations().find((reservation) => reservation.commitment === commitment)
    const inferredBlockHeight = savedReservation
      ? inferredCommittedBlockHeightFromReservation(savedReservation, nextBlockHeight)
      : null

    if (savedReservation && inferredBlockHeight !== null) {
      setPreparedCommit((current) => {
        if (!current || current.commitment !== commitment) return current
        return {
          ...current,
          committedBlockHeight: inferredBlockHeight,
          committedTxId: savedReservation.committedTxId ?? current.committedTxId,
        }
      })
      if (selectedAuthority) {
        updatePendingNameReservationBlock({
          chainId,
          controller: selectedAuthority,
          commitment,
        }, {
          committedBlockHeight: inferredBlockHeight,
          committedTxId: savedReservation.committedTxId,
        })
        loadPendingReservations()
      }
    }
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
  getCurrentBlockHeight: CurrentBlockHeightReader
  indexerClient: DuskDomainsIndexerClient
  loadPendingReservations: () => PendingNameReservation[]
  pendingReservations: PendingNameReservation[]
  setCurrentBlockHeight: (height: number | null) => void
  setNowSeconds: (seconds: number) => void
}

export async function refreshPendingReservationsFromIndexer({
  getCurrentBlockHeight,
  indexerClient,
  loadPendingReservations,
  pendingReservations,
  setCurrentBlockHeight,
  setNowSeconds,
}: RefreshPendingReservationsArgs) {
  const health = await indexerClient.getHealth()
  const nextBlockHeight = currentBlockHeightFromHealth(health) ?? await getCurrentBlockHeight()
  setCurrentBlockHeight(nextBlockHeight)
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
    const committedBlockHeight = indexedCommit?.committedBlockHeight
      ?? inferredCommittedBlockHeightFromReservation(reservation, nextBlockHeight)
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
