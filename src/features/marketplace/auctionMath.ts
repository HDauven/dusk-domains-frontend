import type { IndexedMarketplaceAuction } from '../../names/internal'
import { parseDuskAmountToLux } from '../treasury/feeConfig'

export const AUCTION_BLOCKS_PER_DAY = 8_640
export const AUCTION_MIN_BID_INCREMENT_BPS = 500n
export const MIN_MARKETPLACE_AMOUNT_LUX = 1_000_000_000n

const BPS_DENOMINATOR = 10_000n
const LUX_PER_DUSK = 1_000_000_000n

export function durationBlocks(days: number) {
  return days * AUCTION_BLOCKS_PER_DAY
}

export function minimumBidLux(auction: IndexedMarketplaceAuction) {
  if (!auction.highestBid) return BigInt(auction.reservePriceLux)
  const highest = BigInt(auction.highestBid.amountLux)
  const increase = (highest * AUCTION_MIN_BID_INCREMENT_BPS + BPS_DENOMINATOR - 1n) / BPS_DENOMINATOR
  return highest + (increase > 0n ? increase : 1n)
}

export function minimumBidDusk(auction: IndexedMarketplaceAuction) {
  return formatLuxAsDusk(minimumBidLux(auction))
}

export function formatLuxAsDusk(lux: bigint) {
  const whole = lux / LUX_PER_DUSK
  const fraction = (lux % LUX_PER_DUSK).toString().padStart(9, '0').replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : `${whole}`
}

// Use two decimals, adding precision only when rounding would hide a nonzero value.
export function compactLuxAsDusk(lux: bigint, roundUp = false) {
  let unit = 10_000_000n
  const magnitude = lux < 0n ? -lux : lux
  while (magnitude > 0n && magnitude * 2n < unit) unit /= 10n
  const rounded = (magnitude + (roundUp ? unit - 1n : unit / 2n)) / unit * unit
  return `${lux < 0n ? '-' : ''}${formatLuxAsDusk(rounded)}`
}

// A positive amount that still fits the contracts' u64-as-number arguments.
export function validLuxAmount(value: string) {
  const amount = parseDuskAmountToLux(value)
  if (amount === null || amount <= 0n || amount > BigInt(Number.MAX_SAFE_INTEGER)) return null
  return amount
}

// Keeps a bid the user typed if it still clears the minimum; otherwise resets to the minimum.
export function currentBidDraft(value: string | undefined, auction: IndexedMarketplaceAuction) {
  const current = validLuxAmount(value ?? '')
  return current !== null && current >= minimumBidLux(auction)
    ? (value ?? minimumBidDusk(auction))
    : minimumBidDusk(auction)
}
