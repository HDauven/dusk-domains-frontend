import { formatLuxAsDusk } from './auctionMath'

export function marketplaceAmountRow(label: string, amountLux: bigint) {
  return {
    label,
    value: `${formatLuxAsDusk(amountLux)} DUSK`,
    exactValue: `${formatLuxAsDusk(amountLux)} DUSK`,
  }
}
