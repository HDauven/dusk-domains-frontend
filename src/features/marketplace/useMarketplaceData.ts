import { readSharedHealth } from '../../app/sharedIndexerHealth'
import { useAutoRefresh } from '../../app/useAutoRefresh'
import type { RefreshOptions } from '../../app/singleFlight'
import { auctionStatus } from './marketplacePresentation'
import { marketplaceOrderKey, matchesAuctionSelection, auctionSelection } from './orderIdentity'
import { appendPage, readMarketplacePage, readMarketplaceWindow, type MarketplaceCursors } from './marketplacePages'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
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
  const [loading, setLoading] = useState(true)
  const [readError, setReadError] = useState('')
  const [auctionReadError, setAuctionReadError] = useState('')
  const hasData = useRef(false)
  const [cursors, setCursors] = useState<MarketplaceCursors>({ fixedSales: null, auctions: null, offers: null })
  const loadingMore = useRef(false)
  const refreshPending = useRef(false)
  const loadedPages = useRef(1)
  const requestId = useRef(0)
  const auctionRequest = useRef(0)
  const auctionPending = useRef(false)
  const backgroundSnapshot = useRef<{ updatedAt: number; feeBps: number | null; ownedNames: IndexedNameSummary[]; refund: IndexedMarketplaceRefund | null } | null>(null)
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
    const reportError = setErrorRef.current
    if (!background) reportError('')
    if (!indexerClient) {
      refreshPending.current = false
      setReadError('Marketplace data is unavailable right now.')
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      // Fees and wallet data keep the slow cadence while listings refresh each minute.
      const cachedSnapshot = background && backgroundSnapshot.current && Date.now() - backgroundSnapshot.current.updatedAt < 180_000
        ? backgroundSnapshot.current : null
      const [page, nextOwnedNames, health, nextRefund, config] = await Promise.all([
        readMarketplaceWindow(indexerClient, loadedPages.current),
        cachedSnapshot ? Promise.resolve(cachedSnapshot.ownedNames) : selectedAddress
          ? fetchWalletScopedNames({ indexerClient, selectedAddress, selectedAuthority })
          : Promise.resolve([]),
        readSharedHealth(indexerClient),
        cachedSnapshot ? Promise.resolve(cachedSnapshot.refund) : selectedAuthority ? indexerClient.getMarketplaceRefund(selectedAuthority) : Promise.resolve(null),
        cachedSnapshot ? Promise.resolve({ feeBps: cachedSnapshot.feeBps }) : indexerClient.getMarketplaceConfig?.() ?? Promise.resolve(null),
      ])
      if (!shouldApply()) return

      const selectedNode = selectedAuctionRef.current
      if (selectedNode && (background || !page.auctions.some(auction => matchesAuctionSelection(auction, selectedNode)))) {
        const { node, ...identity } = auctionSelection(selectedNode)
        const selected = await indexerClient.getMarketplaceAuction(node, identity)
        if (!shouldApply()) return
        page.auctions = page.auctions.filter(auction => !matchesAuctionSelection(auction, selectedNode))
        if (selected) page.auctions = [...page.auctions, selected]
      }
      if (!cachedSnapshot) backgroundSnapshot.current = { updatedAt: Date.now(), feeBps: config?.feeBps ?? null, ownedNames: nextOwnedNames, refund: nextRefund }
      hasData.current = true
      setReadError('')
      setAuctionReadError('')
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
      if (shouldApply()) setReadError(hasData.current ? "Couldn't refresh. Retrying…" : 'Marketplace data is unavailable right now.')
      void loadError
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
      setReadError('')
    } catch (error) {
      if (currentRequest === requestId.current) setReadError("Couldn't refresh. Retrying…")
      void error
    } finally {
      if (currentRequest === requestId.current) {
        loadingMore.current = false
        setLoading(false)
      }
    }
  }, [cursors, indexerClient, loading])

  useEffect(() => () => {
    requestId.current += 1
    refreshPending.current = false
    loadingMore.current = false
    backgroundSnapshot.current = null
    setLoading(false)
  }, [accountScope, indexerClient])

  useEffect(() => () => { auctionRequest.current += 1; auctionPending.current = false; setAuctionReadError('') }, [accountScope, indexerClient, selectedAuctionNode])
  const refreshAuction = useCallback(async () => {
    if (!indexerClient || !selectedAuctionNode || auctionPending.current || refreshPending.current || loadingMore.current) return
    const request = ++auctionRequest.current
    const marketRequest = requestId.current
    const shouldApply = () => request === auctionRequest.current && marketRequest === requestId.current
    auctionPending.current = true
    try {
      const { node, ...identity } = auctionSelection(selectedAuctionNode)
      const [auction, health] = await Promise.all([
        indexerClient.getMarketplaceAuction(node, identity),
        readSharedHealth(indexerClient),
      ])
      if (!shouldApply()) return
      setAuctionReadError('')
      setAuctions(current => {
        const others = current.filter(auction => !matchesAuctionSelection(auction, selectedAuctionNode))
        return auction ? [...others, auction] : others
      })
      setCurrentBlockHeight(health.currentBlockHeight)
      setUpdatedAt(Date.now())
    } catch {
      if (shouldApply()) setAuctionReadError("Couldn't refresh. Retrying…")
    } finally {
      if (request === auctionRequest.current) auctionPending.current = false
    }
  }, [indexerClient, selectedAuctionNode])
  const selectedAuction = auctions.find(auction => matchesAuctionSelection(auction, selectedAuctionNode))
  const auctionPollingEnabled = mainView === 'marketplace' && Boolean(selectedAuction && !selectedAuction.returnPending
    && ['live', 'ending', 'ended'].includes(auctionStatus(selectedAuction, currentBlockHeight)))
  useAutoRefresh(refreshAuction, auctionPollingEnabled, 10_000)

  useEffect(() => {
    if (mainView !== 'marketplace') return
    let disposed = false
    globalThis.queueMicrotask(() => { if (!disposed && document.visibilityState !== 'hidden') void loadMarketplace() })
    return () => { disposed = true }
  }, [loadMarketplace, mainView])
  const refresh = useCallback((options?: RefreshOptions) => loadMarketplace(!options?.fresh), [loadMarketplace])
  useAutoRefresh(refresh, mainView === 'marketplace', 60_000)

  return { auctionPollingEnabled, readError: readError || auctionReadError, hasData: updatedAt !== null, feeBps, updatedAt, hasMore, loadMore, auctions, currentBlockHeight, fixedSales, loadMarketplace, loading, offers, ownedNames, refund }
}
