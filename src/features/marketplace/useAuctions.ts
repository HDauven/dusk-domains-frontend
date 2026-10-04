import { appendPage } from './marketplacePages'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  marketplaceCancelAuctionRuntimeCall,
  marketplaceExpireAuctionRuntimeCall,
  marketplacePlaceBidRuntimeCall,
  marketplaceSettleAuctionRuntimeCall,
  userFacingErrorMessage,
  type ActivityEntry,
  type DuskDomainCallMetadata,
  type DuskDomainsIndexerClient,
  type DuskDomainsMarketplaceOnChainClient,
  type IndexedMarketplaceAuction,
} from '../../names/internal'
import { useScopedState } from '../../utils/useScopedState'
import { compactLuxAsDusk, currentBidDraft, formatLuxAsDusk, validLuxAmount } from './auctionMath'
import { canonicalAuction, minimumCanonicalBidLux } from './canonicalMarketplaceState'
import type { MarketplaceViewProps } from './marketplaceTypes'
import type { MarketplaceWrites } from './useMarketplaceWrites'

// An auction's page: its bid history, the bid draft, the review step and the auction's
// lifecycle actions.
export function useAuctions({
  accountScope,
  auctions,
  indexerClient,
  marketplaceOnChainClient,
  marketScope,
  onBidPlaced,
  selectedAuthority,
  selectedAuctionNode,
  setSelectedAuctionNode,
  setConfirmation,
  setError,
  writes,
}: {
  accountScope: string
  auctions: IndexedMarketplaceAuction[]
  indexerClient: DuskDomainsIndexerClient | null
  marketplaceOnChainClient: DuskDomainsMarketplaceOnChainClient | null
  marketScope: string
  onBidPlaced: (node: string) => void
  selectedAuthority: string
  selectedAuctionNode: string
  setSelectedAuctionNode: (node: string) => void
  setConfirmation: (message: string) => void
  setError: (message: string) => void
  writes: MarketplaceWrites
}) {
  const [bidDrafts, setBidDrafts] = useState<Record<string, string>>({})
  const [auctionActivity, setAuctionActivity] = useState<ActivityEntry[]>([])
  const [activityCursor, setActivityCursor] = useState<string | null>(null)
  const activityRequest = useRef(0)
  const activityPending = useRef(false)
  useEffect(() => () => { activityRequest.current += 1; activityPending.current = false }, [indexerClient, marketScope])
  const [auctionActivityLoading, setAuctionActivityLoading] = useState(false)
  const [bidReview, setBidReview] = useScopedState<MarketplaceViewProps['auction']['bidReview']>(accountScope, null)

  // Fresh listings reset any draft that no longer clears the minimum bid.
  const [draftedAuctions, setDraftedAuctions] = useState(auctions)
  if (draftedAuctions !== auctions) {
    setDraftedAuctions(auctions)
    setBidDrafts((current) => Object.fromEntries(auctions.map((auction) => [
      auction.node,
      currentBidDraft(current[auction.node], auction),
    ])))
  }

  const loadAuctionActivity = useCallback(async (node: string, cursor?: string) => {
    if (!indexerClient || !node || (cursor && activityPending.current)) return
    const request = ++activityRequest.current
    activityPending.current = true
    setAuctionActivityLoading(true)
    if (!cursor) setActivityCursor(null)
    try {
      const page = await indexerClient.getActivityPage(node, { cursor })
      if (request !== activityRequest.current) return
      setAuctionActivity((current) => cursor ? appendPage(current, page.activity, (entry) => entry.id) : page.activity)
      setActivityCursor(page.nextCursor)
    } catch (error) {
      if (request === activityRequest.current) setError(userFacingErrorMessage(error))
    } finally {
      if (request === activityRequest.current) {
        setAuctionActivityLoading(false)
        activityPending.current = false
      }
    }
  }, [indexerClient, setError])

  const selectedBidCount = auctions.find((auction) => auction.node === selectedAuctionNode)?.bidCount
  useEffect(() => {
    if (!selectedAuctionNode) return
    queueMicrotask(() => void loadAuctionActivity(selectedAuctionNode))
  }, [loadAuctionActivity, selectedAuctionNode, selectedBidCount])

  // The contract's current auction, or null after reporting why it could not be read.
  const readCanonicalAuction = useCallback(async (auction: IndexedMarketplaceAuction) => {
    if (!marketplaceOnChainClient) return null
    try {
      return await canonicalAuction(marketplaceOnChainClient, auction)
    } catch (readError) {
      setError(userFacingErrorMessage(readError))
      return null
    }
  }, [marketplaceOnChainClient, setError])

  const reviewBid = useCallback(async (auction: IndexedMarketplaceAuction) => {
    const amountLux = validLuxAmount(bidDrafts[auction.node] ?? '')
    if (amountLux === null) {
      setError('Enter a valid bid.')
      return
    }
    const current = await readCanonicalAuction(auction)
    if (!current) return
    const minimumBid = minimumCanonicalBidLux(current)
    if (amountLux < minimumBid) {
      setError(`Bid at least ${compactLuxAsDusk(minimumBid, true)} DUSK.`)
      setBidDrafts((current) => ({ ...current, [auction.node]: compactLuxAsDusk(minimumBid, true) }))
      return
    }
    setError('')
    setConfirmation('')
    setBidReview({
      amountDusk: formatLuxAsDusk(amountLux), amountLux, minimumBidLux: minimumBid,
      auction: {
        ...auction,
        startBlockHeight: current.startBlock,
        endBlockHeight: current.endBlock,
        bidCount: current.bidCount,
        highestBid: current.highestBid ? {
          bidderAuthority: current.highestBid.bidderAuthority,
          amountLux: Number(current.highestBid.amountLux),
          placedAtBlockHeight: current.highestBid.placedAtBlock,
        } : null,
      },
    })
  }, [bidDrafts, readCanonicalAuction, setBidReview, setConfirmation, setError])

  const placeBid = useCallback(async (auction: IndexedMarketplaceAuction) => {
    setBidReview(null)
    const reviewed = bidReview?.auction.node === auction.node ? bidReview : null
    if (!reviewed) {
      setError('Review this bid before submitting it.')
      return
    }
    auction = reviewed.auction
    const amountLux = reviewed.amountLux
    if (!await readCanonicalAuction(auction)) return
    const result = await writes.submit(
      'placing this bid',
      auction.name,
      marketplacePlaceBidRuntimeCall({
        node: auction.node,
        expectedAuctionId: auction.auctionId,
        amountLux: Number(amountLux),
        bidderManager: selectedAuthority || null,
      }),
      amountLux,
      `Bid placed. ${formatLuxAsDusk(amountLux)} DUSK moved into escrow.`,
    )
    if (result?.status === 'executed') {
      onBidPlaced(auction.node)
      await loadAuctionActivity(auction.node)
    }
  }, [bidReview, readCanonicalAuction, loadAuctionActivity, onBidPlaced, selectedAuthority, setBidReview, setError, writes])

  const lifecycleAction = useCallback(async (
    auction: IndexedMarketplaceAuction,
    actionName: string,
    call: DuskDomainCallMetadata,
    successMessage: string,
  ) => {
    if (!await writes.guardCanonicalRead((client) => canonicalAuction(client, auction))) return
    await writes.submit(actionName, auction.name, call, 0n, successMessage)
  }, [writes])

  const openAuction = useCallback((node: string) => {
    setAuctionActivity([])
    setSelectedAuctionNode(node)
  }, [setSelectedAuctionNode])

  const closeAuction = useCallback(() => {
    activityRequest.current += 1
    activityPending.current = false
    setActivityCursor(null)
    setAuctionActivityLoading(false)
    setAuctionActivity([])
    setBidReview(null)
    setSelectedAuctionNode('')
  }, [setBidReview, setSelectedAuctionNode])

  return {
    auctionActivity,
    auctionActivityLoading,
    hasMoreActivity: Boolean(activityCursor),
    loadMoreActivity: () => activityCursor && void loadAuctionActivity(selectedAuctionNode, activityCursor),
    bidDrafts,
    bidReview,
    closeAuction,
    openAuction,
    placeBid,
    reviewBid,
    selectedAuctionNode,
    setBidDraft: (node: string, value: string) => setBidDrafts((current) => ({ ...current, [node]: value })),
    setBidReview,
    setSelectedAuctionNode,
    cancelAuction: (auction: IndexedMarketplaceAuction) => lifecycleAction(
      auction, 'cancelling this auction', marketplaceCancelAuctionRuntimeCall({ node: auction.node, expectedAuctionId: auction.auctionId }), 'Auction canceled.'),
    expireAuction: (auction: IndexedMarketplaceAuction) => lifecycleAction(
      auction, 'closing this dormant auction', marketplaceExpireAuctionRuntimeCall({ node: auction.node, expectedAuctionId: auction.auctionId }), 'Auction closed.'),
    settleAuction: (auction: IndexedMarketplaceAuction) => lifecycleAction(
      auction, 'settling this auction', marketplaceSettleAuctionRuntimeCall({ node: auction.node, expectedAuctionId: auction.auctionId }), 'Auction settled.'),
  }
}
