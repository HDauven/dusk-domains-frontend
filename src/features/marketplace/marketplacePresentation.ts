import type { IndexedMarketplaceAuction } from '../../names/internal'

const BLOCK_SECONDS = 10
const BLOCKS_PER_DAY = 8_640

export type AuctionStatus = 'waiting' | 'live' | 'ending' | 'ended' | 'expired'

export function sameAuthority(left: string | null | undefined, right: string | null | undefined) {
  if (!left || !right) return false
  return authorityKey(left) === authorityKey(right)
}

export function auctionTimeLabel(auction: IndexedMarketplaceAuction, currentBlockHeight: number | null) {
  if (auction.endBlockHeight === null) return 'Starts with first bid'
  if (currentBlockHeight === null) return `Ends at block ${auction.endBlockHeight.toLocaleString()}`
  return blocksTimeLabel(Math.max(0, auction.endBlockHeight - currentBlockHeight), 'Ready to settle')
}

export function auctionDurationLabel(durationBlocks: number) {
  if (durationBlocks % BLOCKS_PER_DAY === 0) {
    const days = durationBlocks / BLOCKS_PER_DAY
    return `${days} ${days === 1 ? 'day' : 'days'}`
  }
  return blocksTimeLabel(durationBlocks, `${durationBlocks.toLocaleString()} blocks`)
}

export function auctionStartWindowLabel(auction: IndexedMarketplaceAuction, currentBlockHeight: number | null) {
  if (auction.startBlockHeight !== null) return 'Auction started'
  if (currentBlockHeight === null) return `Before block ${auction.startDeadlineBlockHeight.toLocaleString()}`
  return blocksTimeLabel(
    Math.max(0, auction.startDeadlineBlockHeight - currentBlockHeight),
    'Start window closed',
  )
}

export function auctionStatus(auction: IndexedMarketplaceAuction, currentBlockHeight: number | null): AuctionStatus {
  if (auction.startBlockHeight === null) {
    if (currentBlockHeight !== null && currentBlockHeight >= auction.startDeadlineBlockHeight) return 'expired'
    return 'waiting'
  }
  if (auction.endBlockHeight !== null && currentBlockHeight !== null) {
    const remaining = auction.endBlockHeight - currentBlockHeight
    if (remaining <= 0) return 'ended'
    if (remaining <= 60) return 'ending'
  }
  return 'live'
}

export function auctionStatusLabel(status: AuctionStatus) {
  if (status === 'waiting') return 'Waiting for first bid'
  if (status === 'ending') return 'Ending soon'
  if (status === 'ended') return 'Finalization pending'
  if (status === 'expired') return 'Start window closed'
  return 'Live auction'
}

export function marketplaceFeeLabel(feeBps: number) {
  const percent = feeBps / 100
  return `${Number.isInteger(percent) ? percent.toFixed(0) : percent.toFixed(2)}%`
}

export function expiryTimeLabel(expiresAt: number, currentBlockHeight: number | null) {
  if (currentBlockHeight === null) return `Block ${expiresAt.toLocaleString()}`
  return blocksTimeLabel(Math.max(0, expiresAt - currentBlockHeight), 'Expired')
}

export function isExpired(expiresAt: number, currentBlockHeight: number | null) {
  return currentBlockHeight !== null && currentBlockHeight >= expiresAt
}

export function blocksTimeLabel(blocks: number, zeroLabel: string) {
  if (blocks === 0) return zeroLabel
  const seconds = blocks * BLOCK_SECONDS
  if (seconds < 3_600) return `${Math.ceil(seconds / 60)}m`
  if (seconds < 86_400) return `${Math.ceil(seconds / 3_600)}h`
  return `${Math.ceil(seconds / 86_400)}d`
}

function authorityKey(value: string) {
  return value.trim().toLowerCase().replace(/^0x/, '')
}
