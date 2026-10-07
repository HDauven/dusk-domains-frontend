import type { Dispatch, SetStateAction } from 'react'
import { currentBlockHeightFromHealth } from '../../app/indexerReadHelpers'
import type { CurrentBlockHeightReader } from '../../app/duskNodeHeight'
import {
  currentUnixSeconds,
  removePendingNameReservation,
  updatePendingNameReservationBlock,
  type DuskDomainsIndexerClient,
  type PendingNameReservation,
} from '../../names/internal'
import { inferredCommittedBlockHeightFromReservation } from './pendingReservationBlockRecovery'
import type { PreparedRegistrationCommit } from './pendingReservationTypes'
import { clearReservationPrimaryChoice } from './reservationPrimaryChoice'

// Commitments are kept per controller, so ask the indexer for this controller's commit. An
// indexer that predates the controller parameter returns the latest commit for the hash, so a
// commit from another controller is still ignored.
export async function indexedOwnCommitment(
  indexerClient: DuskDomainsIndexerClient,
  commitment: string,
  controller: string,
  commitmentStore?: string,
) {
  const indexed = await indexerClient.getCommitment(commitment, isBytes32Hex(controller) ? controller : undefined)
  if (indexed?.commitmentStore && commitmentStore && authorityKey(indexed.commitmentStore) !== authorityKey(commitmentStore)) return null
  if (!indexed || !controller) return indexed
  return authorityKey(indexed.controller) === authorityKey(controller) ? indexed : null
}

function authorityKey(value: string) {
  return value.toLowerCase().replace(/^0x/u, '')
}

function isBytes32Hex(value: string) {
  return /^(0x)?[0-9a-f]{64}$/iu.test(value)
}

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
    indexedOwnCommitment(indexerClient, commitment, selectedAuthority, loadPendingReservations().find(r => r.commitment === commitment)?.commitmentStore),
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
    const [commit, name] = await Promise.allSettled([
      indexedOwnCommitment(indexerClient, reservation.commitment, reservation.controller, reservation.commitmentStore),
      indexerClient.searchName(reservation.name),
    ])
    return {
      reservation,
      indexedCommit: commit.status === 'fulfilled' ? commit.value : null,
      registered: health.ok !== false && name.status === 'fulfilled' && name.value.status === 'registered',
    }
  }))

  let changed = false
  for (const { reservation, indexedCommit, registered } of indexedReservations) {
    if (registered) {
      removePendingNameReservation(reservation)
      clearReservationPrimaryChoice(reservation)
      changed = true
      continue
    }
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
