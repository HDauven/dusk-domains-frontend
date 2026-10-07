import type { PendingNameReservation } from '../../names/internal'
// Time passing does not prove inclusion. Only persisted, observed heights can recover a reveal.
export function inferredCommittedBlockHeightFromReservation(reservation: PendingNameReservation, _currentBlockHeight: number | null, _nowMs = Date.now()) {
 void _nowMs
 return reservation.committedBlockHeight
}
