export type ReservationWindow = {
  status: 'missing' | 'waiting' | 'ready' | 'stale'
  waitBlocks: number
}
