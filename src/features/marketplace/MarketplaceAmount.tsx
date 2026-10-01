import { compactLuxAsDusk, formatLuxAsDusk } from './auctionMath'

export function MarketplaceAmount({ lux, roundUp = false }: { lux: number | bigint; roundUp?: boolean }) {
  const amount = BigInt(lux)
  return <span className="marketplace-amount" title={`${formatLuxAsDusk(amount)} DUSK`}>{compactLuxAsDusk(amount, roundUp)} DUSK</span>
}
