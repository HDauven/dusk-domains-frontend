import { marketplaceAmountRow } from './marketplaceAmounts'
import { useCallback } from 'react'
import {
  marketplaceBuyFixedSaleRuntimeCall,
  marketplaceCancelFixedSaleRuntimeCall,
  marketplaceExpireFixedSaleRuntimeCall,
  userFacingErrorMessage,
  type DuskDomainsMarketplaceOnChainClient,
  type IndexedMarketplaceFixedSale,
} from '../../names/internal'
import { formatLuxAsDusk } from './auctionMath'
import { marketplaceProceeds } from './marketplaceFees'
import { canonicalFixedSale } from './canonicalMarketplaceState'
import type { MarketplaceWrites } from './useMarketplaceWrites'

export function useFixedSales({ marketplaceOnChainClient, selectedAddress, selectedAuthority, setError, writes }: {
  marketplaceOnChainClient: DuskDomainsMarketplaceOnChainClient | null
  selectedAddress: string
  selectedAuthority: string
  setError: (error: string) => void
  writes: MarketplaceWrites
}) {
  const buyFixedSale = useCallback(async function buyFixedSale(sale: IndexedMarketplaceFixedSale, reviewed = false) {
    if (!marketplaceOnChainClient) return
    let canonical
    try {
      canonical = await canonicalFixedSale(marketplaceOnChainClient, sale)
    } catch (readError) {
      setError(userFacingErrorMessage(readError))
      return
    }
    if (!reviewed) {
      const reviewedSale = { ...sale }
      const { proceedsLux, feeLux } = marketplaceProceeds(canonical.priceLux, sale.feeBps)
      writes.requestReview({
        title: `Buy ${sale.name}`,
        rows: [
          {
            ...marketplaceAmountRow('You pay', canonical.priceLux),
            detail: `${formatLuxAsDusk(proceedsLux)} DUSK to the seller · ${formatLuxAsDusk(feeLux)} DUSK marketplace fee to treasury`,
          },
          { label: 'Name moves to your wallet', value: selectedAddress, address: true },
        ],
        note: 'You become the owner and manager. A completed purchase cannot be undone.',
      }, () => buyFixedSale(reviewedSale, true))
      return
    }
    await writes.submit(
      'buying this name',
      sale.name,
      marketplaceBuyFixedSaleRuntimeCall({
        node: sale.node,
        expectedSaleId: sale.saleId,
        priceLux: Number(canonical.priceLux),
        buyerManager: selectedAuthority || null,
      }),
      canonical.priceLux,
      `${sale.name} purchased. ${formatLuxAsDusk(canonical.priceLux)} DUSK paid.`,
    )
  }, [marketplaceOnChainClient, selectedAddress, selectedAuthority, setError, writes])

  const fixedSaleAction = useCallback(async (
    sale: IndexedMarketplaceFixedSale,
    kind: 'cancel' | 'expire',
  ) => {
    if (!await writes.guardCanonicalRead((client) => canonicalFixedSale(client, sale))) return
    if (kind === 'cancel') {
      await writes.submit('cancelling this sale', sale.name, marketplaceCancelFixedSaleRuntimeCall({ node: sale.node, expectedSaleId: sale.saleId }), 0n, 'Sale canceled.')
    } else {
      await writes.submit('closing this expired sale', sale.name, marketplaceExpireFixedSaleRuntimeCall({ node: sale.node, expectedSaleId: sale.saleId }), 0n, 'Sale closed.')
    }
  }, [writes])

  return { buyFixedSale, cancelFixedSale: (sale: IndexedMarketplaceFixedSale) => fixedSaleAction(sale, 'cancel'), expireFixedSale: (sale: IndexedMarketplaceFixedSale) => fixedSaleAction(sale, 'expire') }
}
