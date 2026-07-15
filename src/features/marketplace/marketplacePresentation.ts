import type { IndexedMarketplaceAuction } from '../../names/internal'

export function sameAuthority(left: string | null | undefined, right: string | null | undefined) {
  if (!left || !right) return false
  return authorityKey(left) === authorityKey(right)
}

export function auctionTimeLabel(auction: IndexedMarketplaceAuction, currentBlockHeight: number | null) {
  if (auction.endBlockHeight === null) return 'Starts with first bid'
  if (currentBlockHeight === null) return `Ends at block ${auction.endBlockHeight.toLocaleString()}`
  return blocksTimeLabel(Math.max(0, auction.endBlockHeight - currentBlockHeight), 'Ready to settle')
}

export function expiryTimeLabel(expiresAt: number, currentBlockHeight: number | null) {
  if (currentBlockHeight === null) return `Block ${expiresAt.toLocaleString()}`
  return blocksTimeLabel(Math.max(0, expiresAt - currentBlockHeight), 'Expired')
}

export function isExpired(expiresAt: number, currentBlockHeight: number | null) {
  return currentBlockHeight !== null && currentBlockHeight >= expiresAt
}

function blocksTimeLabel(blocks: number, zeroLabel: string) {
  if (blocks === 0) return zeroLabel
  const seconds = blocks * 10
  if (seconds < 3_600) return `${Math.ceil(seconds / 60)}m`
  if (seconds < 86_400) return `${Math.ceil(seconds / 3_600)}h`
  return `${Math.ceil(seconds / 86_400)}d`
}

function authorityKey(value: string) {
  return value.trim().toLowerCase().replace(/^0x/, '')
}
