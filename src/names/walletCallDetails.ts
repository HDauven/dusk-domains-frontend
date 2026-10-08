import { formatLuxAsDusk } from '@duskdomains/sdk'
import type { WalletFrozenCall } from './transactions'
import { DUSK_APPROX_BLOCK_TIME_SECONDS } from './ui/lifecycle'

export type WalletCallDetails = Record<string, string>

export function withWalletDetails(call: WalletFrozenCall, summary: string, fields: WalletCallDetails) {
  return {
    ...call,
    display: { Summary: summary, ...fields, 'Network fee': 'Paid separately; see wallet estimate' },
  }
}

export function walletExpiry(expiresAt: bigint, currentHeight: bigint) {
  const date = new Date(Date.now() + Number(expiresAt - currentHeight) * DUSK_APPROX_BLOCK_TIME_SECONDS * 1000)
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : 'Date unavailable'
}

export function walletSaleAmounts(amountLux: string, feeBps: number, minimumBid = false) {
  const amount = BigInt(amountLux)
  const fee = amount * BigInt(feeBps) / 10_000n
  const qualifier = minimumBid ? ' at minimum bid' : ''
  return {
    [minimumBid ? 'Minimum bid' : 'Price']: formatLuxAsDusk(amount),
    Fee: `${formatLuxAsDusk(fee)} (${feeBps / 100}%)${qualifier}`,
    Proceeds: `${formatLuxAsDusk(amount - fee)}${qualifier}`,
  }
}
