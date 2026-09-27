import { useCallback, useState } from 'react'
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
import { currentBidDraft, formatLuxAsDusk, validLuxAmount } from './auctionMath'
import { canonicalAuction, minimumCanonicalBidLux } from './canonicalMarketplaceState'
import type { MarketplaceViewProps } from './marketplaceTypes'
import type { MarketplaceWrites } from './useMarketplaceWrites'

// An auction's page: its bid history, the bid draft, the review step and the auction's
// lifecycle actions.
export function useAuctions({
  accountScope,
  auctions,
  indexerClient,
  loadMarketplace,
  marketplaceOnChainClient,
  onBidPlaced,
  selectedAuthority,
  setConfirmation,
  setError,
  writes,
}: {
  accountScope: string
  auctions: IndexedMarketplaceAuction[]
  indexerClient: DuskDomainsIndexerClient | null
  loadMarketplace: () => Promise<void>
  marketplaceOnChainClient: DuskDomainsMarketplaceOnChainClient | null
  onBidPlaced: (node: string) => void
  selectedAuthority: string
  setConfirmation: (message: string) => void
  setError: (message: string) => void
  writes: MarketplaceWrites
}) {
  const [bidDrafts, setBidDrafts] = useState<Record<string, string>>({})
  const [selectedAuctionNode, setSelectedAuctionNode] = useScopedState(accountScope, '')
  const [auctionActivity, setAuctionActivity] = useState<ActivityEntry[]>([])
  const [auctionActivityLoading, setAuctionActivityLoading] = useState(false)
  const [bidReview, setBidReview] = useScopedState<MarketplaceViewProps['bidReview']>(accountScope, null)

  // Fresh listings reset any draft that no longer clears the minimum bid.
  const [draftedAuctions, setDraftedAuctions] = useState(auctions)
  if (draftedAuctions !== auctions) {
    setDraftedAuctions(auctions)
    setBidDrafts((current) => Object.fromEntries(auctions.map((auction) => [
      auction.node,
      currentBidDraft(current[auction.node], auction),
    ])))
  }

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

  // The contract's current minimum, or null after reporting why it could not be read.
  const canonicalMinimum = useCallback(async (auction: IndexedMarketplaceAuction) => {
    if (!marketplaceOnChainClient) return null
    try {
      return minimumCanonicalBidLux(await canonicalAuction(marketplaceOnChainClient, auction))
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
    const minimumBid = await canonicalMinimum(auction)
    if (minimumBid === null) return
    if (amountLux < minimumBid) {
      setError(`Bid at least ${formatLuxAsDusk(minimumBid)} DUSK.`)
      setBidDrafts((current) => ({ ...current, [auction.node]: formatLuxAsDusk(minimumBid) }))
      return
    }
    setError('')
    setConfirmation('')
    setBidReview({ amountDusk: formatLuxAsDusk(amountLux), amountLux, auction, minimumBidLux: minimumBid })
  }, [bidDrafts, canonicalMinimum, setBidReview, setConfirmation, setError])

  const placeBid = useCallback(async (auction: IndexedMarketplaceAuction) => {
    setBidReview(null)
    const reviewed = bidReview?.auction.node === auction.node ? bidReview : null
    const amountLux = reviewed?.amountLux ?? validLuxAmount(bidDrafts[auction.node] ?? '')
    if (amountLux === null) {
      setError('Enter a valid bid.')
      return
    }
    const minimumBid = await canonicalMinimum(auction)
    if (minimumBid === null) return
    if (amountLux < minimumBid) {
      setBidDrafts((current) => ({ ...current, [auction.node]: formatLuxAsDusk(minimumBid) }))
      setError(`The minimum bid is now ${formatLuxAsDusk(minimumBid)} DUSK.`)
      await loadMarketplace()
      return
    }
    const result = await writes.submit(
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
      onBidPlaced(auction.node)
      await loadAuctionActivity(auction.node)
    }
  }, [bidDrafts, bidReview, canonicalMinimum, loadAuctionActivity, loadMarketplace, onBidPlaced, selectedAuthority, setBidReview, setError, writes])

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
    void loadAuctionActivity(node)
  }, [loadAuctionActivity, setSelectedAuctionNode])

  const closeAuction = useCallback(() => {
    setAuctionActivity([])
    setBidReview(null)
    setSelectedAuctionNode('')
  }, [setBidReview, setSelectedAuctionNode])

  return {
    auctionActivity,
    auctionActivityLoading,
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
      auction, 'cancelling this auction', marketplaceCancelAuctionRuntimeCall({ node: auction.node }), 'Auction canceled.'),
    expireAuction: (auction: IndexedMarketplaceAuction) => lifecycleAction(
      auction, 'closing this dormant auction', marketplaceExpireAuctionRuntimeCall({ node: auction.node }), 'Auction closed.'),
    settleAuction: (auction: IndexedMarketplaceAuction) => lifecycleAction(
      auction, 'settling this auction', marketplaceSettleAuctionRuntimeCall({ node: auction.node }), 'Auction settled.'),
  }
}
