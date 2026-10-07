export type ReservationWindow = {
  status: 'missing' | 'future' | 'waiting' | 'ready' | 'stale'
  waitBlocks: number
}
