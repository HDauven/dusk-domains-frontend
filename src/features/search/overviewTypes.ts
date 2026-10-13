export type ReservationWindow = {
  status: 'missing' | 'future' | 'waiting' | 'ready' | 'stale'
  waitBlocks: number
  /** Blocks until the reservation expires. */
  staleInBlocks?: number
}
