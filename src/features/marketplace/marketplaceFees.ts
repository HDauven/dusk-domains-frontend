import { marketplaceAmountRow } from './marketplaceAmounts'
import { marketplaceFeeLabel } from './marketplacePresentation'

export function marketplaceProceeds(amountLux: bigint, feeBps: number) {
  const feeLux = amountLux * BigInt(feeBps) / 10_000n
  return { feeLux, proceedsLux: amountLux - feeLux }
}

export function proceedsRows(amountLux: bigint, feeBps: number) {
  const { feeLux, proceedsLux } = marketplaceProceeds(amountLux, feeBps)
  return [
    marketplaceAmountRow(`Marketplace fee (${marketplaceFeeLabel(feeBps)}) to treasury`, feeLux),
    marketplaceAmountRow('Seller receives', proceedsLux),
  ]
}
