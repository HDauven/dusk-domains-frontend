import { useEffect, useState } from 'react'
import type { DuskDomainsIndexerClient } from '../../names/internal'
import type { HeldListing } from '../domains/myDomainsData'

const REFRESH_MS = 60_000

/** The open fixed-price listing or auction of a name the market holds; null otherwise. */
export function useNameListing({ indexerClient, node, escrowed }: {
  indexerClient: Pick<DuskDomainsIndexerClient, 'getMarketplaceFixedSale' | 'getMarketplaceAuction'> | null
  node: string
  escrowed: boolean
}) {
  const [state, setState] = useState<{ node: string, listing: HeldListing | null } | null>(null)
  useEffect(() => {
    if (!indexerClient || !node || !escrowed) return
    let active = true
    const read = async () => {
      const [sale, auction] = await Promise.all([
        indexerClient.getMarketplaceFixedSale(node).catch(() => null),
        indexerClient.getMarketplaceAuction(node).catch(() => null),
      ])
      if (!active) return
      setState({ node, listing: sale ? { kind: 'fixed', name: sale.name, node, listing: sale }
        : auction ? { kind: 'auction', name: auction.name, node, listing: auction } : null })
    }
    void read()
    const timer = setInterval(() => void read(), REFRESH_MS)
    return () => { active = false; clearInterval(timer) }
  }, [escrowed, indexerClient, node])
  return escrowed && state?.node === node ? state.listing : null
}
