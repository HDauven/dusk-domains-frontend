import { marketplaceClaimRefundRequest, type IndexedMarketplaceRefund } from '../../names/internal'
import { formatLuxAsDusk } from './auctionMath'
import { canonicalRefund } from './canonicalMarketplaceState'
import type { MarketplaceWrites } from './useMarketplaceWrites'

// Each market pays out its own refunds, so a refund is withdrawn from the market that holds it.
export function useMarketplaceRefund(writes: MarketplaceWrites) {
  return async (refund: IndexedMarketplaceRefund) => {
    if (!await writes.guardCanonicalRead((client) => canonicalRefund(client, refund))) return
    await writes.submit('withdrawing your refund', { action: 'Marketplace refund' }, { ...marketplaceClaimRefundRequest(), contractId: refund.marketplaceContractId ?? undefined }, `${formatLuxAsDusk(BigInt(refund.amountLux))} DUSK withdrawn to your wallet.`)
  }
}
