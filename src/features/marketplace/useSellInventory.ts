import { useMemo } from 'react'
import type { IndexedMarketplaceAuction, IndexedMarketplaceFixedSale, IndexedNameSummary } from '../../names/internal'
import { useScopedState } from '../../utils/useScopedState'
import { sameAuthority } from './marketplacePresentation'

export function useSellInventory({ accountScope, ownedNames, auctions, fixedSales, selectedAuthority, requestedName }: {
  requestedName?: string
  accountScope: string
  ownedNames: IndexedNameSummary[]
  auctions: IndexedMarketplaceAuction[]
  fixedSales: IndexedMarketplaceFixedSale[]
  selectedAuthority: string
}) {
  const [selectedNode, setSelectedNode] = useScopedState(accountScope, '')
  const sellableNames = useMemo(() => {
    const listed = new Set([...fixedSales, ...auctions].map((order) => order.node))
    return ownedNames.filter((name) => name.status === 'active' && sameAuthority(name.owner, selectedAuthority)
      && name.canonicalName.split('.').length === 2 && !listed.has(name.node))
  }, [auctions, fixedSales, ownedNames, selectedAuthority])
  const selectedName = sellableNames.find(name => name.node === selectedNode) ?? (requestedName ? sellableNames.find(name => name.canonicalName === requestedName) : sellableNames[0]) ?? null
  return { sellableNames, selectedName, selectedNode: selectedName?.node ?? '', setSelectedNode }
}
