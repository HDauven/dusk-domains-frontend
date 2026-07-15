import {
  REGISTRATION_MIN_REVEAL_WAIT_BLOCKS,
  type PendingNameReservation,
} from '../../names/internal'

const stalePendingReservationRecoveryDelayMs = 75_000

export function inferredCommittedBlockHeightFromReservation(
  reservation: PendingNameReservation,
  currentBlockHeight: number | null,
  nowMs = Date.now(),
) {
  if (reservation.committedBlockHeight !== null) return reservation.committedBlockHeight
  if (!reservation.committedTxId || currentBlockHeight === null) return null

  const referenceTime = Date.parse(reservation.updatedAt || reservation.createdAt)
  if (!Number.isFinite(referenceTime)) return null
  if (nowMs - referenceTime < stalePendingReservationRecoveryDelayMs) return null

  return Math.max(0, currentBlockHeight - REGISTRATION_MIN_REVEAL_WAIT_BLOCKS)
}
