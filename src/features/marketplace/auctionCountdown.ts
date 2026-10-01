import { DUSK_APPROX_BLOCK_TIME_SECONDS } from '../../names/internal'

// The estimate ticks between observed blocks; only chain height can end an auction.
export function auctionCountdown(endBlock: number, currentBlock: number | null, elapsedSeconds = 0) {
  if (currentBlock === null) return 'Waiting for chain time'
  if (currentBlock >= endBlock) return 'Ready to finalize'
  const seconds = Math.max(0, Math.ceil((endBlock - currentBlock) * DUSK_APPROX_BLOCK_TIME_SECONDS - elapsedSeconds))
  if (!seconds) return 'Waiting for the next block'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor(seconds % 86400 / 3600)
  const minutes = Math.floor(seconds % 3600 / 60)
  return `${days ? `${days}d ` : ''}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

