import { marketplaceOrderKey, matchesAuctionSelection, auctionSelection } from './orderIdentity'
import { appendPage, readMarketplacePage, readMarketplaceWindow, type MarketplaceCursors } from './marketplacePages'
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
  selectedAuctionNode = '',
  selectedAuthority,
  setError,
}: {
  accountScope: string
  indexerClient: DuskDomainsIndexerClient | null
  mainView: string
  onLoaded?: (snapshot: MarketplaceSnapshot) => void
  selectedAddress: string
  selectedAuctionNode?: string
  selectedAuthority: string
  setError: (message: string) => void
}) {
  const [feeBps, setFeeBps] = useScopedState<number | null>(accountScope, null)
  const [fixedSales, setFixedSales] = useState<IndexedMarketplaceFixedSale[]>([])
  const [auctions, setAuctions] = useState<IndexedMarketplaceAuction[]>([])
  const [offers, setOffers] = useState<IndexedMarketplaceOffer[]>([])
  const [refund, setRefund] = useScopedState<IndexedMarketplaceRefund | null>(accountScope, null)
  const [ownedNames, setOwnedNames] = useScopedState<IndexedNameSummary[]>(accountScope, [])
  const [currentBlockHeight, setCurrentBlockHeight] = useState<number | null>(null)
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [cursors, setCursors] = useState<MarketplaceCursors>({ fixedSales: null, auctions: null, offers: null })
  const loadingMore = useRef(false)
  const refreshPending = useRef(false)
  const loadedPages = useRef(1)
  const requestId = useRef(0)
  const onLoadedRef = useRef(onLoaded)
  const setErrorRef = useRef(setError)
  const selectedAuctionRef = useRef(selectedAuctionNode)
  useEffect(() => {
    onLoadedRef.current = onLoaded
    setErrorRef.current = setError
    selectedAuctionRef.current = selectedAuctionNode
  })

  const loadMarketplace = useCallback(async (background = false) => {
    if (background && (loadingMore.current || refreshPending.current)) return
    refreshPending.current = true
    if (!background) loadedPages.current = 1
    const nextRequestId = requestId.current + 1
    requestId.current = nextRequestId
    const shouldApply = () => requestId.current === nextRequestId

    loadingMore.current = false
    setCursors({ fixedSales: null, auctions: null, offers: null })
    const reportError = setErrorRef.current
    if (!background) reportError('')
    if (!indexerClient) {
      setFixedSales([])
      setAuctions([])
      setOffers([])
      setOwnedNames([])
      setRefund(null)
      refreshPending.current = false
      reportError('Marketplace data is unavailable right now.')
      return
    }

    setLoading(true)
    try {
      const [page, nextOwnedNames, health, nextRefund, config] = await Promise.all([
        readMarketplaceWindow(indexerClient, loadedPages.current),
        selectedAddress
          ? fetchWalletScopedNames({ indexerClient, selectedAddress, selectedAuthority })
          : Promise.resolve([]),
        indexerClient.getHealth(),
        selectedAuthority ? indexerClient.getMarketplaceRefund(selectedAuthority) : Promise.resolve(null),
        indexerClient.getMarketplaceConfig?.() ?? Promise.resolve(null),
      ])
      if (!shouldApply()) return

      const selectedNode = selectedAuctionRef.current
      if (selectedNode && !page.auctions.some((auction) => matchesAuctionSelection(auction, selectedNode))) {
        const { node, ...identity } = auctionSelection(selectedNode)
        const selected = await indexerClient.getMarketplaceAuction(node, identity)
        if (!shouldApply()) return
        if (selected) page.auctions = [...page.auctions, selected]
      }
      setFeeBps(config?.feeBps ?? null)
      setFixedSales(page.fixedSales)
      setAuctions(page.auctions)
      setOffers(page.offers)
      setCursors(page.cursors)
      setOwnedNames(nextOwnedNames)
      setCurrentBlockHeight(health.currentBlockHeight)
      setUpdatedAt(Date.now())
      setRefund(nextRefund?.amountLux ? nextRefund : null)
      onLoadedRef.current?.({ auctions: page.auctions, fixedSales: page.fixedSales, ownedNames: nextOwnedNames })
    } catch (loadError) {
      if (shouldApply()) reportError(userFacingErrorMessage(loadError))
    } finally {
      if (shouldApply()) { setLoading(false); refreshPending.current = false }
    }
  }, [indexerClient, selectedAddress, selectedAuthority, setOwnedNames, setRefund, setFeeBps])

  const hasMore = Object.values(cursors).some(Boolean)
  const loadMore = useCallback(async () => {
    if (!indexerClient || loading || loadingMore.current || !Object.values(cursors).some(Boolean)) return
    const currentRequest = requestId.current
    loadingMore.current = true
    setLoading(true)
    const reportError = setErrorRef.current
    reportError('')
    try {
      const page = await readMarketplacePage(indexerClient, cursors)
      if (currentRequest !== requestId.current) return
      setFixedSales((current) => appendPage(current, page.fixedSales, marketplaceOrderKey))
      setAuctions((current) => appendPage(current, page.auctions, marketplaceOrderKey))
      setOffers((current) => appendPage(current, page.offers, marketplaceOrderKey))
      setCursors(page.cursors)
      loadedPages.current += 1
    } catch (error) {
      if (currentRequest === requestId.current) reportError(userFacingErrorMessage(error))
    } finally {
      if (currentRequest === requestId.current) {
        loadingMore.current = false
        setLoading(false)
      }
    }
  }, [cursors, indexerClient, loading])

  useEffect(() => () => { requestId.current += 1 }, [accountScope, indexerClient])

  useEffect(() => {
    if (mainView !== 'marketplace') return
    let disposed = false
    const refresh = () => { if (!disposed && document.visibilityState !== 'hidden') void loadMarketplace(true) }
    globalThis.queueMicrotask(() => { if (!disposed) void loadMarketplace() })
    const timer = window.setInterval(refresh, 10_000)
    window.addEventListener('focus', refresh)
    return () => {
      disposed = true
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [loadMarketplace, mainView])

  return { feeBps, updatedAt, hasMore, loadMore, auctions, currentBlockHeight, fixedSales, loadMarketplace, loading, offers, ownedNames, refund }
}
