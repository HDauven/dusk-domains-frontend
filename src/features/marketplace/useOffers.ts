import { stringifyJson, type NameRef } from '@duskdomains/sdk'
import { marketplaceAmountRow } from './marketplaceAmounts'
import { useCallback, useState } from 'react'
import {
  storeAcceptMarketplaceOfferRequest,
  marketplaceCancelOfferRequest,
  marketplaceExpireOfferRequest,
  marketplacePlaceOfferRequest,
  namehashHex,
  normalizeNameInput,
  userFacingErrorMessage,
  validateName,
  type DuskDomainsMarketplaceOnChainClient,
  type DuskDomainsOnChainClient,
  type DuskDomainsOnChainOffer,
  type IndexedMarketplaceOffer,
  type IndexedNameSummary,
} from '../../names/internal'
import { proceedsRows } from './marketplaceFees'
import { abbreviate } from '../../utils/format'
import { durationBlocks, formatLuxAsDusk, MIN_MARKETPLACE_AMOUNT_LUX, validLuxAmount } from './auctionMath'
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

  const placeOffer = useCallback(async function placeOffer(reviewed = false, reviewedRef?: NameRef) {
    const validation = validateName(offerName)
    if (!validation.ok) {
      setError(validation.issues.find((issue) => issue.tone === 'danger')?.text ?? 'Enter a valid name.')
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
    let currentRef: NameRef | undefined
    try {
      const target = await canonicalOfferTarget(duskDomainsOnChainClient, canonicalName, node, selectedAuthority)
      currentRef = target.ref ?? undefined
      if (reviewedRef && stringifyJson(reviewedRef) !== stringifyJson(currentRef)) throw new Error('Name incarnation changed. Review the offer again.')
      canonicalHeight = target.currentBlockHeight
      await canonicalOfferAbsent(marketplaceOnChainClient, node, selectedAuthority)
    } catch (readError) {
      setError(userFacingErrorMessage(readError))
      return
    }
    if (!reviewed) {
      writes.requestReview({
        title: `Offer on ${canonicalName}`,
        createsOrder: true,
        rows: [
          marketplaceAmountRow('Your wallet → marketplace escrow', amountLux),
          { label: 'If accepted, name moves to', value: selectedAddress, address: true },
          { label: 'Valid for', value: `${days} ${days === 1 ? 'day' : 'days'}` },
        ],
        note: 'The owner can accept while this offer is open. To get your funds back, cancel the offer (or close it after expiry), then withdraw the refund under Yours.',
      }, () => placeOffer(true, currentRef))
      return
    }
    await writes.submit(
      'placing this offer',
      canonicalName,
      { ...marketplacePlaceOfferRequest({
        node,
        amountLux: Number(amountLux),
        expiresAt: canonicalHeight + durationBlocks(days),
        buyerManager: selectedAuthority || null,
      }), contractId: marketplaceContractId, nameRef: currentRef },
      `Offer placed. ${formatLuxAsDusk(amountLux)} DUSK moved into escrow.`,
    )
  }, [duskDomainsOnChainClient, marketplaceContractId, marketplaceOnChainClient, offerAmountDusk, offerDurationDays, offerName, selectedAddress, selectedAuthority, setError, writes])

  const acceptOffer = useCallback(async function acceptOffer(offer: IndexedMarketplaceOffer, reviewed?: DuskDomainsOnChainOffer) {
    if (!marketplaceOnChainClient || !duskDomainsOnChainClient) return
    const ownedName = ownedNames.find((name) => name.node === offer.node)
    if (!ownedName) {
      setError('Name ownership changed. Check the owner before trying again.')
      return
    }
    let current: DuskDomainsOnChainOffer
    try {
      current = await canonicalOffer(marketplaceOnChainClient, offer)
      if (reviewed && (current.offerId !== reviewed.offerId || current.feeBps !== reviewed.feeBps || current.amountLux !== reviewed.amountLux)) {
        throw new Error('Marketplace state changed on-chain. Review the latest terms before trying again.')
      }
      await canonicalOwnedName(duskDomainsOnChainClient, ownedName, selectedAuthority)
    } catch (readError) {
      setError(userFacingErrorMessage(readError))
      return
    }
    if (!reviewed) {
      const terms = { ...current }
      writes.requestReview({
        title: `Accept offer for ${offer.name}`,
        namespace: ownedName.namespace,
        transfersNamespace: true,
        rows: [
          { label: 'Name moves to buyer', value: abbreviate(offer.buyerAuthority) },
          marketplaceAmountRow('Payment from escrow', BigInt(offer.amountLux)),
          ...proceedsRows(BigInt(offer.amountLux), offer.feeBps),
          { label: 'Your payout address', value: selectedAddress, address: true },
        ],
        note: 'You transfer ownership and management to the buyer. This sale is final.',
      }, () => acceptOffer(offer, terms))
      return
    }
    await writes.submit(
      'accepting this offer',
      offer.name,
      { ...storeAcceptMarketplaceOfferRequest({
        node: offer.node,
        marketplaceContract: offer.marketplaceContractId ?? marketplaceContractId,
        buyerAuthority: offer.buyerAuthority,
        // Bind the placement and financial terms captured by the review.
        expectedAmountLux: Number(reviewed.amountLux),
        expectedOfferId: reviewed.offerId,
        expectedFeeBps: reviewed.feeBps,
        sellerRecipient: selectedAddress,
      }), reviewedOrder: reviewed.order, contractId: offer.marketplaceContractId ?? marketplaceContractId },
      `Offer accepted. ${formatLuxAsDusk(BigInt(offer.amountLux))} DUSK paid from escrow.`,
    )
  }, [duskDomainsOnChainClient, marketplaceContractId, marketplaceOnChainClient, ownedNames, selectedAddress, selectedAuthority, setError, writes])

  const cancelOffer = useCallback(async (offer: IndexedMarketplaceOffer) => {
    let offerId = 0
    let reviewedOrder: DuskDomainsOnChainOffer['order']
    if (!await writes.guardCanonicalRead(async (client) => { const canonical = await canonicalOffer(client, offer); offerId = canonical.offerId; reviewedOrder = canonical.order })) return
    await writes.submit('cancelling this offer', offer.name, { ...marketplaceCancelOfferRequest({ node: offer.node, expectedOfferId: offerId }), reviewedOrder, contractId: offer.marketplaceContractId ?? marketplaceContractId },
      'Offer canceled. Claim the refund when ready.')
  }, [marketplaceContractId, writes])

  const expireOffer = useCallback(async (offer: IndexedMarketplaceOffer) => {
    let offerId = 0
    let reviewedOrder: DuskDomainsOnChainOffer['order']
    if (!await writes.guardCanonicalRead(async (client) => { const canonical = await canonicalOffer(client, offer); offerId = canonical.offerId; reviewedOrder = canonical.order })) return
    await writes.submit('closing this expired offer', offer.name,
      { ...marketplaceExpireOfferRequest({ node: offer.node, buyerAuthority: offer.buyerAuthority, expectedOfferId: offerId }), reviewedOrder, contractId: offer.marketplaceContractId ?? marketplaceContractId },
      'Offer closed. The buyer can claim the refund.')
  }, [marketplaceContractId, writes])

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
