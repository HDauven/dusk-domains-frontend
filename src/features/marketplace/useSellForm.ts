import { stringifyJson, type NameRef } from '@duskdomains/sdk'
import { marketplaceAmountRow } from './marketplaceAmounts'
import { useCallback, useState } from 'react'
import { contractPrincipalInput } from '../../app/principalInput'
import {
  storeEscrowAuctionRequest,
  storeEscrowFixedSaleRequest,
  userFacingErrorMessage,
  type DuskDomainsOnChainClient,
  type IndexedNameSummary,
} from '../../names/internal'
import { proceedsRows } from './marketplaceFees'
import { durationBlocks, MIN_MARKETPLACE_AMOUNT_LUX, validLuxAmount } from './auctionMath'
import { canonicalOwnedName } from './canonicalMarketplaceState'
import type { MarketplaceSaleMode } from './marketplaceTypes'
import type { MarketplaceWrites } from './useMarketplaceWrites'

// The Sell tab: a fixed-price listing or an auction for one of the wallet's names.
export function useSellForm({
  feeBps,
  duskDomainsOnChainClient,
  marketplaceContractId,
  onOpenWalletConnection,
  selectedAddress,
  selectedAuthority,
  selectedName,
  setError,
  writes,
}: {
  feeBps: number | null
  duskDomainsOnChainClient: DuskDomainsOnChainClient | null
  marketplaceContractId: string
  onOpenWalletConnection: () => void
  selectedAddress: string
  selectedAuthority: string
  selectedName: IndexedNameSummary | null
  setError: (message: string) => void
  writes: MarketplaceWrites
}) {
  const [saleMode, setSaleMode] = useState<MarketplaceSaleMode>('fixed')
  const [fixedPriceDusk, setFixedPriceDusk] = useState('25')
  const [privateBuyer, setPrivateBuyer] = useState('')
  const [reserveDusk, setReserveDusk] = useState('25')
  const [durationDays, setDurationDays] = useState('7')

  const createListing = useCallback(async function createListing(reviewed = false, reviewedRef?: NameRef) {
    if (feeBps === null) { setError('The marketplace fee is still loading. Try again shortly.'); return }
    if (!selectedName) {
      setError('Choose a name to sell.')
      return
    }
    if (!marketplaceContractId) {
      setError('Marketplace contract is not configured.')
      return
    }
    if (!selectedAddress) {
      onOpenWalletConnection()
      setError('Connect your wallet to sell a name.')
      return
    }

    const days = Number(durationDays)
    const allowedDurations = saleMode === 'auction' ? [1, 3, 7, 14, 30] : [1, 3, 7, 14, 30, 90, 180]
    if (!allowedDurations.includes(days)) {
      setError('Choose a valid sale duration.')
      return
    }

    let currentRef: NameRef | undefined
    const bind = (ref: NameRef | null | undefined) => {
      if (reviewedRef && stringifyJson(reviewedRef) !== stringifyJson(ref)) throw new Error('Name incarnation changed. Review the listing again.')
      currentRef = ref ?? undefined
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
        bind((await canonicalOwnedName(duskDomainsOnChainClient, selectedName, selectedAuthority)).ref)
      } catch (readError) {
        setError(userFacingErrorMessage(readError))
        return
      }
      if (!reviewed) {
        writes.requestReview({
          title: `Auction ${selectedName.canonicalName}`,
          createsOrder: true,
          namespace: selectedName.namespace,
          transfersNamespace: true,
          rows: [
            { label: 'Name moves to', value: 'Marketplace escrow' },
            marketplaceAmountRow('Minimum bid', reserveLux),
            ...proceedsRows(reserveLux, feeBps),
            { label: 'Your payout address', value: selectedAddress, address: true },
            { label: 'Duration after first bid', value: `${days} ${days === 1 ? 'day' : 'days'}` },
          ],
          note: 'Proceeds are shown at the minimum bid and the current fee. You can cancel before the first bid. Once bidding starts, the name stays in escrow until finalization. Bids in the last 10 minutes extend it.',
        }, () => createListing(true, currentRef))
        return
      }
      await writes.submit(
        'creating this auction',
        selectedName.canonicalName,
        { ...storeEscrowAuctionRequest({
          node: selectedName.node,
          marketplaceContract: marketplaceContractId,
          name: selectedName.canonicalName,
          reservePriceLux: Number(reserveLux),
          durationBlocks: durationBlocks(days),
          sellerRecipient: selectedAddress,
        }), expectedFeeBps: feeBps, nameRef: currentRef },
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
      privateBuyerAuthority = privateBuyer.trim() ? contractPrincipalInput(privateBuyer, 'Private buyer') : null
    } catch (inputError) {
      setError(userFacingErrorMessage(inputError))
      return
    }
    if (!duskDomainsOnChainClient) return
    let canonicalHeight: number
    try {
      const canonicalName = await canonicalOwnedName(duskDomainsOnChainClient, selectedName, selectedAuthority)
      canonicalHeight = canonicalName.currentBlockHeight
      bind(canonicalName.ref)
    } catch (readError) {
      setError(userFacingErrorMessage(readError))
      return
    }
    if (!reviewed) {
      writes.requestReview({
        title: `List ${selectedName.canonicalName}`,
        createsOrder: true,
        namespace: selectedName.namespace,
        transfersNamespace: true,
        rows: [
          { label: 'Name moves to', value: 'Marketplace escrow' },
          marketplaceAmountRow('Price', priceLux),
          ...proceedsRows(priceLux, feeBps),
          { label: 'Your payout address', value: selectedAddress, address: true },
          { label: 'Private buyer', value: privateBuyer.trim() || 'Anyone', address: Boolean(privateBuyer.trim()) },
          { label: 'Listing duration', value: `${days} ${days === 1 ? 'day' : 'days'}` },
        ],
        note: 'Proceeds use the current marketplace fee. The name stays in escrow until it sells or you cancel. If it expires, close the listing to return the name to your wallet.',
      }, () => createListing(true, currentRef))
      return
    }
    await writes.submit(
      'listing this name',
      selectedName.canonicalName,
      { ...storeEscrowFixedSaleRequest({
        node: selectedName.node,
        marketplaceContract: marketplaceContractId,
        name: selectedName.canonicalName,
        priceLux: Number(priceLux),
        privateBuyer: privateBuyerAuthority,
        expiresAt: canonicalHeight + durationBlocks(days),
        sellerRecipient: selectedAddress,
      }), expectedFeeBps: feeBps, nameRef: currentRef },
      0n,
      'Name listed for sale.',
    )
  }, [
    feeBps,
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
    setError,
    writes,
  ])

  return {
    createListing,
    durationDays,
    fixedPriceDusk,
    privateBuyer,
    reserveDusk,
    saleMode,
    setDurationDays,
    setFixedPriceDusk,
    setPrivateBuyer,
    setReserveDusk,
    setSaleMode,
  }
}
