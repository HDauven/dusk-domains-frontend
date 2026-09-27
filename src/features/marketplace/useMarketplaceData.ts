import { useCallback, useEffect, useRef, useState } from 'react'
import {
  userFacingErrorMessage,
  type DuskDomainsIndexerClient,
  type IndexedMarketplaceAuction,
  type IndexedMarketplaceFixedSale,
  type IndexedMarketplaceOffer,
  type IndexedMarketplaceRefund,
  type IndexedNameSummary,
} from '../../names/internal'
import { useScopedState } from '../../utils/useScopedState'
import { fetchWalletScopedNames } from '../domains/myDomainsData'

export type MarketplaceSnapshot = {
  auctions: IndexedMarketplaceAuction[]
  fixedSales: IndexedMarketplaceFixedSale[]
  ownedNames: IndexedNameSummary[]
}

// Listings, offers, the wallet's names and refund, read from the indexer. Only the newest
// request may write state, so a slow response never overwrites a fresher one.
export function useMarketplaceData({
  accountScope,
  indexerClient,
  mainView,
  onLoaded,
  selectedAddress,
  selectedAuthority,
  setError,
}: {
  accountScope: string
  indexerClient: DuskDomainsIndexerClient | null
  mainView: string
  onLoaded: (snapshot: MarketplaceSnapshot) => void
  selectedAddress: string
  selectedAuthority: string
  setError: (message: string) => void
}) {
  const [fixedSales, setFixedSales] = useState<IndexedMarketplaceFixedSale[]>([])
  const [auctions, setAuctions] = useState<IndexedMarketplaceAuction[]>([])
  const [offers, setOffers] = useState<IndexedMarketplaceOffer[]>([])
  const [refund, setRefund] = useScopedState<IndexedMarketplaceRefund | null>(accountScope, null)
  const [ownedNames, setOwnedNames] = useScopedState<IndexedNameSummary[]>(accountScope, [])
  const [currentBlockHeight, setCurrentBlockHeight] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const requestId = useRef(0)
  const onLoadedRef = useRef(onLoaded)
  useEffect(() => { onLoadedRef.current = onLoaded })

  const loadMarketplace = useCallback(async () => {
    const nextRequestId = requestId.current + 1
    requestId.current = nextRequestId
    const shouldApply = () => requestId.current === nextRequestId

    setError('')
    if (!indexerClient) {
      setFixedSales([])
      setAuctions([])
      setOffers([])
      setOwnedNames([])
      setRefund(null)
      setError('Marketplace data is unavailable right now.')
      return
    }

    setLoading(true)
    try {
      const [nextFixedSales, nextAuctions, nextOffers, nextOwnedNames, health, nextRefund] = await Promise.all([
        indexerClient.getMarketplaceFixedSales(),
        indexerClient.getMarketplaceAuctions(),
        indexerClient.getMarketplaceOffers(),
        selectedAddress
          ? fetchWalletScopedNames({ indexerClient, selectedAddress, selectedAuthority })
          : Promise.resolve([]),
        indexerClient.getHealth(),
        selectedAuthority ? indexerClient.getMarketplaceRefund(selectedAuthority) : Promise.resolve(null),
      ])
      if (!shouldApply()) return

      setFixedSales(nextFixedSales)
      setAuctions(nextAuctions)
      setOffers(nextOffers)
      setOwnedNames(nextOwnedNames)
      setCurrentBlockHeight(health.currentBlockHeight)
      setRefund(nextRefund?.amountLux ? nextRefund : null)
      onLoadedRef.current({ auctions: nextAuctions, fixedSales: nextFixedSales, ownedNames: nextOwnedNames })
    } catch (loadError) {
      if (shouldApply()) setError(userFacingErrorMessage(loadError))
    } finally {
      if (shouldApply()) setLoading(false)
    }
  }, [indexerClient, selectedAddress, selectedAuthority, setError, setOwnedNames, setRefund])

  useEffect(() => {
    if (mainView !== 'marketplace') return
    globalThis.queueMicrotask(() => void loadMarketplace())
  }, [loadMarketplace, mainView])

  return { auctions, currentBlockHeight, fixedSales, loadMarketplace, loading, offers, ownedNames, refund }
}
