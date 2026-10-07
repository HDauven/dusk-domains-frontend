import { marketplaceClaimRefundRequest, type IndexedMarketplaceRefund } from '../../names/internal'
import { formatLuxAsDusk } from './auctionMath'
import { canonicalRefund } from './canonicalMarketplaceState'
import type { MarketplaceWrites } from './useMarketplaceWrites'

export function useMarketplaceRefund(refund: IndexedMarketplaceRefund | null, writes: MarketplaceWrites) {
  return async () => {
    if (!refund || !await writes.guardCanonicalRead((client) => canonicalRefund(client, refund))) return
    await writes.submit('withdrawing your refund', 'Marketplace refund', { ...marketplaceClaimRefundRequest(), contractId: refund.marketplaceContractId ?? undefined }, `${formatLuxAsDusk(BigInt(refund.amountLux))} DUSK withdrawn to your wallet.`)
  }
}
