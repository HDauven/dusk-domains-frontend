import { DUSK_APPROX_BLOCK_TIME_SECONDS } from '../../names/internal'

// Block heights are exact; indexer timestamps are estimates. When both heights are known the
// age comes from them, so a wrong clock on the indexer can never date an event in the future.
export function activityWhen(
  blockHeight: number | null | undefined,
  currentBlockHeight: number | null,
  timestamp: string,
  formatTimestamp: (timestamp: string) => string,
) {
  if (blockHeight == null) return 'Pending'
  if (currentBlockHeight == null || currentBlockHeight < blockHeight) return formatTimestamp(timestamp)
  const seconds = (currentBlockHeight - blockHeight) * DUSK_APPROX_BLOCK_TIME_SECONDS
  if (seconds < 90) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 36) return `${hours} h ago`
  const days = Math.round(hours / 24)
  if (days < 60) return `${days} days ago`
  const months = Math.round(days / 30)
  return months < 24 ? `${months} months ago` : `${Math.round(months / 12)} years ago`
}
