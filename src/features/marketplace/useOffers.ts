import { useCallback, useState } from 'react'
import {
  coreAcceptMarketplaceOfferRuntimeCall,
  marketplaceCancelOfferRuntimeCall,
  marketplaceExpireOfferRuntimeCall,
  marketplacePlaceOfferRuntimeCall,
  namehashHex,
  normalizeNameInput,
  userFacingErrorMessage,
  validateName,
  type DuskDomainsMarketplaceOnChainClient,
  type DuskDomainsOnChainClient,
  type IndexedMarketplaceOffer,
  type IndexedNameSummary,
} from '../../names/internal'
import { durationBlocks, MIN_MARKETPLACE_AMOUNT_LUX, validLuxAmount } from './auctionMath'
import {
  canonicalOffer,
  canonicalOfferAbsent,
  canonicalOfferTarget,
  canonicalOwnedName,
} from './canonicalMarketplaceState'
import type { MarketplaceWrites } from './useMarketplaceWrites'

// The Offers tab: make an offer on any name, and answer offers on the wallet's own names.
export function useOffers({
  duskDomainsOnChainClient,
  marketplaceContractId,
  marketplaceOnChainClient,
  ownedNames,
  selectedAddress,
  selectedAuthority,
  setError,
  writes,
}: {
  duskDomainsOnChainClient: DuskDomainsOnChainClient | null
  marketplaceContractId: string
  marketplaceOnChainClient: DuskDomainsMarketplaceOnChainClient | null
  ownedNames: IndexedNameSummary[]
  selectedAddress: string
  selectedAuthority: string
  setError: (message: string) => void
  writes: MarketplaceWrites
}) {
  const [offerName, setOfferName] = useState('')
  const [offerAmountDusk, setOfferAmountDusk] = useState('25')
  const [offerDurationDays, setOfferDurationDays] = useState('7')

  const placeOffer = useCallback(async () => {
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
      const target = await canonicalOfferTarget(duskDomainsOnChainClient, canonicalName, node, selectedAuthority)
      canonicalHeight = target.currentBlockHeight
      await canonicalOfferAbsent(marketplaceOnChainClient, node, selectedAuthority)
    } catch (readError) {
      setError(userFacingErrorMessage(readError))
      return
    }
    await writes.submit(
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
  }, [duskDomainsOnChainClient, marketplaceOnChainClient, offerAmountDusk, offerDurationDays, offerName, selectedAuthority, setError, writes])

  const acceptOffer = useCallback(async (offer: IndexedMarketplaceOffer) => {
    if (!marketplaceOnChainClient || !duskDomainsOnChainClient) return
    const ownedName = ownedNames.find((name) => name.node === offer.node)
    if (!ownedName) {
      setError('Domain ownership changed. Refresh and try again.')
      return
    }
    try {
      await canonicalOffer(marketplaceOnChainClient, offer)
      await canonicalOwnedName(duskDomainsOnChainClient, ownedName, selectedAuthority)
    } catch (readError) {
      setError(userFacingErrorMessage(readError))
      return
    }
    await writes.submit(
      'accepting this offer',
      offer.name,
      coreAcceptMarketplaceOfferRuntimeCall({
        node: offer.node,
        marketplaceContract: marketplaceContractId,
        buyerAuthority: offer.buyerAuthority,
        sellerRecipient: selectedAddress,
      }),
      0n,
      'Offer accepted.',
    )
  }, [duskDomainsOnChainClient, marketplaceContractId, marketplaceOnChainClient, ownedNames, selectedAddress, selectedAuthority, setError, writes])

  const cancelOffer = useCallback(async (offer: IndexedMarketplaceOffer) => {
    if (!await writes.guardCanonicalRead((client) => canonicalOffer(client, offer))) return
    await writes.submit('cancelling this offer', offer.name, marketplaceCancelOfferRuntimeCall({ node: offer.node }), 0n,
      'Offer canceled. Claim the refund when ready.')
  }, [writes])

  const expireOffer = useCallback(async (offer: IndexedMarketplaceOffer) => {
    if (!await writes.guardCanonicalRead((client) => canonicalOffer(client, offer))) return
    await writes.submit('closing this expired offer', offer.name,
      marketplaceExpireOfferRuntimeCall({ node: offer.node, buyerAuthority: offer.buyerAuthority }), 0n,
      'Offer closed. The buyer can claim the refund.')
  }, [writes])

  return {
    acceptOffer,
    cancelOffer,
    expireOffer,
    offerAmountDusk,
    offerDurationDays,
    offerName,
    placeOffer,
    setOfferAmountDusk,
    setOfferDurationDays,
    setOfferName,
  }
}
