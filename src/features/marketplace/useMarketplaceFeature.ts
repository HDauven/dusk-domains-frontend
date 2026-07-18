import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  coreAcceptMarketplaceOfferRuntimeCall,
  coreEscrowAuctionRuntimeCall,
  coreEscrowFixedSaleRuntimeCall,
  marketplaceBuyFixedSaleRuntimeCall,
  marketplaceCancelAuctionRuntimeCall,
  marketplaceCancelFixedSaleRuntimeCall,
  marketplaceCancelOfferRuntimeCall,
  marketplaceClaimRefundRuntimeCall,
  marketplaceExpireAuctionRuntimeCall,
  marketplaceExpireFixedSaleRuntimeCall,
  marketplaceExpireOfferRuntimeCall,
  marketplacePlaceBidRuntimeCall,
  marketplacePlaceOfferRuntimeCall,
  marketplaceSettleAuctionRuntimeCall,
  namehashHex,
  normalizeNameInput,
  userFacingErrorMessage,
  validateName,
  type ActivityEntry,
  type DuskDomainCallMetadata,
  type DuskDomainContractMap,
  type DuskDomainsIndexerClient,
  type DuskDomainsMarketplaceOnChainClient,
  type DuskDomainsOnChainClient,
  type DuskDomainsRuntimeConfig,
  type DuskDomainTxState,
  type IndexedMarketplaceAuction,
  type IndexedMarketplaceFixedSale,
  type IndexedMarketplaceOffer,
  type IndexedMarketplaceRefund,
  type IndexedNameSummary,
} from '../../names/internal'
import { contractPrincipalInput } from '../../app/appHelpers'
import { fetchWalletScopedNames } from '../domains/myDomainsData'
import { parseDuskAmountToLux } from '../treasury/feeConfig'
import {
  durationBlocks,
  MIN_MARKETPLACE_AMOUNT_LUX,
  minimumBidDusk,
  minimumBidLux,
} from './auctionMath'
import type { MarketplaceSaleMode, MarketplaceTab, MarketplaceViewProps } from './marketplaceTypes'
import {
  canonicalAuction,
  canonicalFixedSale,
  canonicalOwnedName,
  canonicalOffer,
  canonicalOfferAbsent,
  canonicalOfferTarget,
  canonicalRefund,
  minimumCanonicalBidLux,
} from './canonicalMarketplaceState'

const MARKETPLACE_WATCHLIST_KEY = 'dusk-domains-marketplace-watchlist-v1'

type SubmitNameWrite = (
  name: string,
  call: DuskDomainCallMetadata,
  options?: {
    contracts?: DuskDomainContractMap
    onUpdate?: (state: DuskDomainTxState) => void
  },
) => Promise<DuskDomainTxState>

type UseMarketplaceFeatureArgs = {
  ensurePublicBalanceForLiveWrite: (
    action: string,
    setError: (message: string) => void,
    transactionCount?: number,
    extraRequiredLux?: bigint,
  ) => Promise<boolean>
  indexerClient: DuskDomainsIndexerClient | null
  duskDomainsOnChainClient: DuskDomainsOnChainClient | null
  liveWritesAvailable: boolean
  marketplaceOnChainClient: DuskDomainsMarketplaceOnChainClient | null
  mainView: string
  onOpenWalletConnection: () => void
  runtimeConfig: DuskDomainsRuntimeConfig
  selectedAddress: string
  selectedAuthority: string
  submitNameWrite: SubmitNameWrite
}

export function useMarketplaceFeature(args: UseMarketplaceFeatureArgs) {
  const {
    ensurePublicBalanceForLiveWrite,
    duskDomainsOnChainClient,
    indexerClient,
    liveWritesAvailable,
    marketplaceOnChainClient,
    mainView,
    onOpenWalletConnection,
    runtimeConfig,
    selectedAddress,
    selectedAuthority,
    submitNameWrite,
  } = args
  const [fixedSales, setFixedSales] = useState<IndexedMarketplaceFixedSale[]>([])
  const [auctions, setAuctions] = useState<IndexedMarketplaceAuction[]>([])
  const [offers, setOffers] = useState<IndexedMarketplaceOffer[]>([])
  const [refund, setRefund] = useState<IndexedMarketplaceRefund | null>(null)
  const [ownedNames, setOwnedNames] = useState<IndexedNameSummary[]>([])
  const [tab, setTab] = useState<MarketplaceTab>('browse')
  const [saleMode, setSaleMode] = useState<MarketplaceSaleMode>('fixed')
  const [selectedNode, setSelectedNode] = useState('')
  const [fixedPriceDusk, setFixedPriceDusk] = useState('25')
  const [privateBuyer, setPrivateBuyer] = useState('')
  const [reserveDusk, setReserveDusk] = useState('25')
  const [durationDays, setDurationDays] = useState('7')
  const [bidDrafts, setBidDrafts] = useState<Record<string, string>>({})
  const [offerName, setOfferName] = useState('')
  const [offerAmountDusk, setOfferAmountDusk] = useState('25')
  const [offerDurationDays, setOfferDurationDays] = useState('7')
  const [currentBlockHeight, setCurrentBlockHeight] = useState<number | null>(null)
  const [selectedAuctionNode, setSelectedAuctionNode] = useState('')
  const [auctionActivity, setAuctionActivity] = useState<ActivityEntry[]>([])
  const [auctionActivityLoading, setAuctionActivityLoading] = useState(false)
  const [bidReview, setBidReview] = useState<MarketplaceViewProps['bidReview']>(null)
  const [watchedNodes, setWatchedNodes] = useState<string[]>(readWatchlist)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [txState, setTxState] = useState<DuskDomainTxState | null>(null)
  const requestId = useRef(0)

  const marketplaceEnabled = Boolean(runtimeConfig.capabilities.marketplace && runtimeConfig.contracts.marketplace)
  const actionsAvailable = marketplaceEnabled
    && liveWritesAvailable
    && Boolean(marketplaceOnChainClient)
    && Boolean(duskDomainsOnChainClient)
  const marketplaceContractId = runtimeConfig.contracts.marketplace?.contractId ?? ''
  const activeOrderNodes = useMemo(() => new Set([
    ...fixedSales.map((sale) => sale.node),
    ...auctions.map((auction) => auction.node),
  ]), [auctions, fixedSales])
  const sellableNames = useMemo(() => ownedNames.filter((name) => (
    name.status === 'active' && !activeOrderNodes.has(name.node)
  )), [activeOrderNodes, ownedNames])
  const selectedName = useMemo(() => (
    sellableNames.find((name) => name.node === selectedNode) ?? sellableNames[0] ?? null
  ), [sellableNames, selectedNode])

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
      setSelectedNode((current) => {
        if (current && nextOwnedNames.some((name) => name.node === current)) return current
        return nextOwnedNames.find((name) => !nextFixedSales.some((sale) => sale.node === name.node)
          && !nextAuctions.some((auction) => auction.node === name.node))?.node ?? ''
      })
      setBidDrafts((current) => Object.fromEntries(nextAuctions.map((auction) => [
        auction.node,
        currentBidDraft(current[auction.node], auction),
      ])))
    } catch (loadError) {
      if (shouldApply()) setError(userFacingErrorMessage(loadError))
    } finally {
      if (shouldApply()) setLoading(false)
    }
  }, [indexerClient, selectedAddress, selectedAuthority])

  useEffect(() => {
    if (mainView !== 'marketplace') return
    globalThis.queueMicrotask(() => void loadMarketplace())
  }, [loadMarketplace, mainView])

  const loadAuctionActivity = useCallback(async (node: string) => {
    if (!indexerClient || !node) {
      setAuctionActivity([])
      return
    }
    setAuctionActivityLoading(true)
    try {
      setAuctionActivity(await indexerClient.getActivity(node))
    } catch {
      setAuctionActivity([])
    } finally {
      setAuctionActivityLoading(false)
    }
  }, [indexerClient])

  const submitMarketplaceAction = useCallback(async (
    actionName: string,
    name: string,
    call: DuskDomainCallMetadata,
    depositLux = 0n,
    successMessage = 'Marketplace updated.',
  ) => {
    setError('')
    setConfirmation('')
    setTxState(null)

    if (!actionsAvailable) {
      setError('Marketplace writes are not enabled for this deployment.')
      return null
    }
    if (!selectedAddress) {
      onOpenWalletConnection()
      setError('Connect your wallet to continue.')
      return null
    }
    if (!await ensurePublicBalanceForLiveWrite(actionName, setError, 1, depositLux)) return null

    try {
      const finalState = await submitNameWrite(name, call, {
        contracts: runtimeConfig.contracts,
        onUpdate: setTxState,
      })
      setTxState(finalState)
      if (finalState.status === 'executed') {
        setConfirmation(successMessage)
        await loadMarketplace()
      }
      return finalState
    } catch (submitError) {
      setError(userFacingErrorMessage(submitError))
      return null
    }
  }, [
    actionsAvailable,
    ensurePublicBalanceForLiveWrite,
    loadMarketplace,
    onOpenWalletConnection,
    runtimeConfig.contracts,
    selectedAddress,
    submitNameWrite,
  ])

  const handleCreateListing = useCallback(async () => {
    if (!selectedName) {
      setError('Choose a domain to sell.')
      return
    }
    if (!marketplaceContractId) {
      setError('Marketplace contract is not configured.')
      return
    }
    if (!selectedAddress) {
      onOpenWalletConnection()
      setError('Connect your wallet to sell a domain.')
      return
    }

    const days = Number(durationDays)
    const allowedDurations = saleMode === 'auction' ? [1, 3, 7, 14, 30] : [1, 3, 7, 14, 30, 90, 180]
    if (!allowedDurations.includes(days)) {
      setError('Choose a valid sale duration.')
      return
    }

    if (saleMode === 'auction') {
      const reserveLux = validLuxAmount(reserveDusk)
      if (reserveLux === null) {
        setError('Enter a valid reserve.')
        return
      }
      if (reserveLux < MIN_MARKETPLACE_AMOUNT_LUX) {
        setError('Reserve at least 1 DUSK.')
        return
      }
      if (!duskDomainsOnChainClient) return
      try {
        await canonicalOwnedName(
          duskDomainsOnChainClient,
          selectedName,
          selectedAuthority,
        )
      } catch (readError) {
        setError(userFacingErrorMessage(readError))
        return
      }
      await submitMarketplaceAction(
        'creating this auction',
        selectedName.canonicalName,
        coreEscrowAuctionRuntimeCall({
          node: selectedName.node,
          marketplaceContract: marketplaceContractId,
          name: selectedName.canonicalName,
          reservePriceLux: Number(reserveLux),
          durationBlocks: durationBlocks(days),
          sellerRecipient: selectedAddress,
        }),
        0n,
        'Auction created. The first bid starts the timer.',
      )
      return
    }

    const priceLux = validLuxAmount(fixedPriceDusk)
    if (priceLux === null) {
      setError('Enter a valid sale price.')
      return
    }
    if (priceLux < MIN_MARKETPLACE_AMOUNT_LUX) {
      setError('Price at least 1 DUSK.')
      return
    }
    let privateBuyerAuthority: string | null
    try {
      privateBuyerAuthority = privateBuyer.trim()
        ? contractPrincipalInput(privateBuyer, 'Private buyer')
        : null
    } catch (inputError) {
      setError(userFacingErrorMessage(inputError))
      return
    }
    if (!duskDomainsOnChainClient) return
    let canonicalHeight: number
    try {
      const canonicalName = await canonicalOwnedName(
        duskDomainsOnChainClient,
        selectedName,
        selectedAuthority,
      )
      canonicalHeight = canonicalName.currentBlockHeight
    } catch (readError) {
      setError(userFacingErrorMessage(readError))
      return
    }
    await submitMarketplaceAction(
      'listing this domain',
      selectedName.canonicalName,
      coreEscrowFixedSaleRuntimeCall({
        node: selectedName.node,
        marketplaceContract: marketplaceContractId,
        name: selectedName.canonicalName,
        priceLux: Number(priceLux),
        privateBuyer: privateBuyerAuthority,
        expiresAt: canonicalHeight + durationBlocks(days),
        sellerRecipient: selectedAddress,
      }),
      0n,
      'Domain listed for sale.',
    )
  }, [
    duskDomainsOnChainClient,
    durationDays,
    fixedPriceDusk,
    marketplaceContractId,
    onOpenWalletConnection,
    privateBuyer,
    reserveDusk,
    saleMode,
    selectedAddress,
    selectedAuthority,
    selectedName,
    submitMarketplaceAction,
  ])

  const handleBuyFixedSale = useCallback(async (sale: IndexedMarketplaceFixedSale) => {
    if (!marketplaceOnChainClient) return
    let canonical
    try {
      canonical = await canonicalFixedSale(marketplaceOnChainClient, sale)
    } catch (readError) {
      setError(userFacingErrorMessage(readError))
      return
    }
    await submitMarketplaceAction(
      'buying this domain',
      sale.name,
      marketplaceBuyFixedSaleRuntimeCall({
        node: sale.node,
        priceLux: Number(canonical.priceLux),
        buyerManager: selectedAuthority || null,
      }),
      canonical.priceLux,
      `${sale.name} purchased.`,
    )
  }, [marketplaceOnChainClient, selectedAuthority, submitMarketplaceAction])

  const handleReviewBid = useCallback(async (auction: IndexedMarketplaceAuction) => {
    const amountLux = validLuxAmount(bidDrafts[auction.node] ?? '')
    if (amountLux === null) {
      setError('Enter a valid bid.')
      return
    }
    if (!marketplaceOnChainClient) return
    let minimumBid: bigint
    try {
      const canonical = await canonicalAuction(marketplaceOnChainClient, auction)
      minimumBid = minimumCanonicalBidLux(canonical)
    } catch (readError) {
      setError(userFacingErrorMessage(readError))
      return
    }
    if (amountLux < minimumBid) {
      setError(`Bid at least ${formatLuxAsDusk(minimumBid)} DUSK.`)
      setBidDrafts((current) => ({ ...current, [auction.node]: formatLuxAsDusk(minimumBid) }))
      return
    }
    setError('')
    setConfirmation('')
    setBidReview({
      amountDusk: formatLuxAsDusk(amountLux),
      amountLux,
      auction,
      minimumBidLux: minimumBid,
    })
  }, [bidDrafts, marketplaceOnChainClient])

  const handlePlaceBid = useCallback(async (auction: IndexedMarketplaceAuction) => {
    const reviewed = bidReview?.auction.node === auction.node ? bidReview : null
    const amountLux = reviewed?.amountLux ?? validLuxAmount(bidDrafts[auction.node] ?? '')
    if (amountLux === null) {
      setError('Enter a valid bid.')
      return
    }
    if (!marketplaceOnChainClient) return
    let minimumBid: bigint
    try {
      const canonical = await canonicalAuction(marketplaceOnChainClient, auction)
      minimumBid = minimumCanonicalBidLux(canonical)
    } catch (readError) {
      setBidReview(null)
      setError(userFacingErrorMessage(readError))
      return
    }
    if (amountLux < minimumBid) {
      setBidReview(null)
      setBidDrafts((current) => ({ ...current, [auction.node]: formatLuxAsDusk(minimumBid) }))
      setError(`The minimum bid is now ${formatLuxAsDusk(minimumBid)} DUSK.`)
      await loadMarketplace()
      return
    }
    const result = await submitMarketplaceAction(
      'placing this bid',
      auction.name,
      marketplacePlaceBidRuntimeCall({
        node: auction.node,
        amountLux: Number(amountLux),
        bidderManager: selectedAuthority || null,
      }),
      amountLux,
      'Bid placed.',
    )
    if (result?.status === 'executed') {
      setBidReview(null)
      setWatchedNodes((current) => {
        if (current.includes(auction.node)) return current
        const next = [...current, auction.node]
        writeWatchlist(next)
        return next
      })
      await loadAuctionActivity(auction.node)
    }
  }, [bidDrafts, bidReview, loadAuctionActivity, loadMarketplace, marketplaceOnChainClient, selectedAuthority, submitMarketplaceAction])

  const handlePlaceOffer = useCallback(async () => {
    const validation = validateName(offerName)
    if (!validation.ok) {
      setError(validation.issues.find((issue) => issue.tone === 'danger')?.text ?? 'Enter a valid domain.')
      return
    }
    const amountLux = validLuxAmount(offerAmountDusk)
    const days = Number(offerDurationDays)
    if (amountLux === null) {
      setError('Enter a valid offer.')
      return
    }
    if (amountLux < MIN_MARKETPLACE_AMOUNT_LUX) {
      setError('Offer at least 1 DUSK.')
      return
    }
    if (![1, 3, 7, 14, 30].includes(days)) {
      setError('Choose a valid offer duration.')
      return
    }
    const canonicalName = normalizeNameInput(offerName)
    const node = namehashHex(canonicalName)
    if (!marketplaceOnChainClient || !duskDomainsOnChainClient) return
    let canonicalHeight: number
    try {
      const target = await canonicalOfferTarget(
        duskDomainsOnChainClient,
        canonicalName,
        node,
        selectedAuthority,
      )
      canonicalHeight = target.currentBlockHeight
      await canonicalOfferAbsent(marketplaceOnChainClient, node, selectedAuthority)
    } catch (readError) {
      setError(userFacingErrorMessage(readError))
      return
    }
    await submitMarketplaceAction(
      'placing this offer',
      canonicalName,
      marketplacePlaceOfferRuntimeCall({
        node,
        amountLux: Number(amountLux),
        expiresAt: canonicalHeight + durationBlocks(days),
        buyerManager: selectedAuthority || null,
      }),
      amountLux,
      'Offer placed.',
    )
  }, [
    duskDomainsOnChainClient,
    offerAmountDusk,
    offerDurationDays,
    offerName,
    marketplaceOnChainClient,
    selectedAuthority,
    submitMarketplaceAction,
  ])

  const simpleAction = useCallback((
    actionName: string,
    name: string,
    call: DuskDomainCallMetadata,
    successMessage: string,
  ) => submitMarketplaceAction(actionName, name, call, 0n, successMessage), [submitMarketplaceAction])

  const guardCanonicalRead = useCallback(async (
    read: (client: DuskDomainsMarketplaceOnChainClient) => Promise<unknown>,
  ) => {
    if (!marketplaceOnChainClient) {
      setError('Marketplace contract reads are unavailable right now.')
      return false
    }
    try {
      await read(marketplaceOnChainClient)
      return true
    } catch (readError) {
      setError(userFacingErrorMessage(readError))
      return false
    }
  }, [marketplaceOnChainClient])

  const handleAcceptOffer = useCallback(async (offer: IndexedMarketplaceOffer) => {
    if (!marketplaceOnChainClient || !duskDomainsOnChainClient) return
    const ownedName = ownedNames.find((name) => name.node === offer.node)
    if (!ownedName) {
      setError('Domain ownership changed. Refresh and try again.')
      return
    }
    try {
      await canonicalOffer(marketplaceOnChainClient, offer)
      await canonicalOwnedName(
        duskDomainsOnChainClient,
        ownedName,
        selectedAuthority,
      )
    } catch (readError) {
      setError(userFacingErrorMessage(readError))
      return
    }
    await simpleAction(
      'accepting this offer',
      offer.name,
      coreAcceptMarketplaceOfferRuntimeCall({
        node: offer.node,
        marketplaceContract: marketplaceContractId,
        buyerAuthority: offer.buyerAuthority,
        sellerRecipient: selectedAddress,
      }),
      'Offer accepted.',
    )
  }, [
    duskDomainsOnChainClient,
    marketplaceContractId,
    marketplaceOnChainClient,
    ownedNames,
    selectedAddress,
    selectedAuthority,
    simpleAction,
  ])

  const handleClaimRefund = useCallback(async () => {
    if (!marketplaceOnChainClient || !refund) return
    try {
      await canonicalRefund(marketplaceOnChainClient, refund)
    } catch (readError) {
      setError(userFacingErrorMessage(readError))
      return
    }
    await simpleAction('claiming marketplace funds', 'Marketplace refund', marketplaceClaimRefundRuntimeCall(), 'Refund claimed.')
  }, [marketplaceOnChainClient, refund, simpleAction])

  const handleCancelAuction = useCallback(async (auction: IndexedMarketplaceAuction) => {
    if (!await guardCanonicalRead((client) => canonicalAuction(client, auction))) return
    await simpleAction('cancelling this auction', auction.name, marketplaceCancelAuctionRuntimeCall({ node: auction.node }), 'Auction canceled.')
  }, [guardCanonicalRead, simpleAction])

  const handleCancelFixedSale = useCallback(async (sale: IndexedMarketplaceFixedSale) => {
    if (!await guardCanonicalRead((client) => canonicalFixedSale(client, sale))) return
    await simpleAction('cancelling this sale', sale.name, marketplaceCancelFixedSaleRuntimeCall({ node: sale.node }), 'Sale canceled.')
  }, [guardCanonicalRead, simpleAction])

  const handleCancelOffer = useCallback(async (offer: IndexedMarketplaceOffer) => {
    if (!await guardCanonicalRead((client) => canonicalOffer(client, offer))) return
    await simpleAction('cancelling this offer', offer.name, marketplaceCancelOfferRuntimeCall({ node: offer.node }), 'Offer canceled. Claim the refund when ready.')
  }, [guardCanonicalRead, simpleAction])

  const handleExpireAuction = useCallback(async (auction: IndexedMarketplaceAuction) => {
    if (!await guardCanonicalRead((client) => canonicalAuction(client, auction))) return
    await simpleAction('closing this dormant auction', auction.name, marketplaceExpireAuctionRuntimeCall({ node: auction.node }), 'Auction closed.')
  }, [guardCanonicalRead, simpleAction])

  const handleExpireFixedSale = useCallback(async (sale: IndexedMarketplaceFixedSale) => {
    if (!await guardCanonicalRead((client) => canonicalFixedSale(client, sale))) return
    await simpleAction('closing this expired sale', sale.name, marketplaceExpireFixedSaleRuntimeCall({ node: sale.node }), 'Sale closed.')
  }, [guardCanonicalRead, simpleAction])

  const handleExpireOffer = useCallback(async (offer: IndexedMarketplaceOffer) => {
    if (!await guardCanonicalRead((client) => canonicalOffer(client, offer))) return
    await simpleAction('closing this expired offer', offer.name, marketplaceExpireOfferRuntimeCall({ node: offer.node, buyerAuthority: offer.buyerAuthority }), 'Offer closed. The buyer can claim the refund.')
  }, [guardCanonicalRead, simpleAction])

  const handleSettleAuction = useCallback(async (auction: IndexedMarketplaceAuction) => {
    if (!await guardCanonicalRead((client) => canonicalAuction(client, auction))) return
    await simpleAction('settling this auction', auction.name, marketplaceSettleAuctionRuntimeCall({ node: auction.node }), 'Auction settled.')
  }, [guardCanonicalRead, simpleAction])

  const handleToggleWatch = useCallback((node: string) => {
    setWatchedNodes((current) => {
      const next = current.includes(node)
        ? current.filter((currentNode) => currentNode !== node)
        : [...current, node]
      writeWatchlist(next)
      return next
    })
  }, [])

  const handleOpenAuction = useCallback((node: string) => {
    setAuctionActivity([])
    setSelectedAuctionNode(node)
    void loadAuctionActivity(node)
  }, [loadAuctionActivity])

  const handleCloseAuction = useCallback(() => {
    setAuctionActivity([])
    setBidReview(null)
    setSelectedAuctionNode('')
  }, [])

  const marketplaceProps: MarketplaceViewProps = {
    actionsAvailable,
    auctions,
    auctionActivity,
    auctionActivityLoading,
    bidDrafts,
    bidReview,
    confirmation,
    currentBlockHeight,
    durationDays,
    error,
    fixedPriceDusk,
    fixedSales,
    loading,
    marketplaceEnabled,
    offerAmountDusk,
    offerDurationDays,
    offerName,
    offers,
    privateBuyer,
    refund,
    reserveDusk,
    saleMode,
    selectedAddress,
    selectedAuctionNode,
    selectedAuthority,
    selectedNode,
    sellableNames,
    tab,
    txState,
    watchedNodes,
    onAcceptOffer: handleAcceptOffer,
    onBidDraftChange: (node, value) => setBidDrafts((current) => ({ ...current, [node]: value })),
    onCancelBidReview: () => setBidReview(null),
    onBuyFixedSale: handleBuyFixedSale,
    onCancelAuction: handleCancelAuction,
    onCancelFixedSale: handleCancelFixedSale,
    onCancelOffer: handleCancelOffer,
    onClaimRefund: handleClaimRefund,
    onCreateListing: handleCreateListing,
    onDurationDaysChange: setDurationDays,
    onExpireAuction: handleExpireAuction,
    onExpireFixedSale: handleExpireFixedSale,
    onExpireOffer: handleExpireOffer,
    onFixedPriceDuskChange: setFixedPriceDusk,
    onOfferAmountDuskChange: setOfferAmountDusk,
    onOfferDurationDaysChange: setOfferDurationDays,
    onOfferNameChange: setOfferName,
    onOpenWalletConnection,
    onOpenAuction: handleOpenAuction,
    onPlaceBid: handlePlaceBid,
    onPlaceOffer: handlePlaceOffer,
    onPrivateBuyerChange: setPrivateBuyer,
    onRefresh: loadMarketplace,
    onReviewBid: (auction) => void handleReviewBid(auction),
    onReserveDuskChange: setReserveDusk,
    onSaleModeChange: setSaleMode,
    onSelectedNodeChange: setSelectedNode,
    onSettleAuction: handleSettleAuction,
    onTabChange: (nextTab) => {
      setTab(nextTab)
      if (nextTab !== 'browse') setSelectedAuctionNode('')
    },
    onToggleWatch: handleToggleWatch,
    onCloseAuction: handleCloseAuction,
  }

  return { loadMarketplace, marketplaceProps }
}

function validLuxAmount(value: string) {
  const amount = parseDuskAmountToLux(value)
  if (amount === null || amount <= 0n || amount > BigInt(Number.MAX_SAFE_INTEGER)) return null
  return amount
}

function formatLuxAsDusk(value: bigint): string {
  const whole = value / 1_000_000_000n
  const fraction = (value % 1_000_000_000n).toString().padStart(9, '0').replace(/0+$/u, '')
  return fraction ? `${whole}.${fraction}` : whole.toString()
}

function currentBidDraft(value: string | undefined, auction: IndexedMarketplaceAuction) {
  const current = validLuxAmount(value ?? '')
  return current !== null && current >= minimumBidLux(auction)
    ? (value ?? minimumBidDusk(auction))
    : minimumBidDusk(auction)
}

function readWatchlist() {
  try {
    const value = globalThis.localStorage?.getItem(MARKETPLACE_WATCHLIST_KEY)
    const parsed: unknown = value ? JSON.parse(value) : []
    return Array.isArray(parsed) ? parsed.filter((node): node is string => typeof node === 'string') : []
  } catch {
    return []
  }
}

function writeWatchlist(nodes: string[]) {
  try {
    globalThis.localStorage?.setItem(MARKETPLACE_WATCHLIST_KEY, JSON.stringify(nodes))
  } catch {
    // Watching remains available for this session when browser storage is unavailable.
  }
}

export type MarketplaceFeature = ReturnType<typeof useMarketplaceFeature>
