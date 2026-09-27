import { useCallback, useState } from 'react'
import { contractPrincipalInput } from '../../app/appHelpers'
import {
  coreEscrowAuctionRuntimeCall,
  coreEscrowFixedSaleRuntimeCall,
  userFacingErrorMessage,
  type DuskDomainsOnChainClient,
  type IndexedNameSummary,
} from '../../names/internal'
import { durationBlocks, MIN_MARKETPLACE_AMOUNT_LUX, validLuxAmount } from './auctionMath'
import { canonicalOwnedName } from './canonicalMarketplaceState'
import type { MarketplaceSaleMode } from './marketplaceTypes'
import type { MarketplaceWrites } from './useMarketplaceWrites'

// The Sell tab: a fixed-price listing or an auction for one of the wallet's names.
export function useSellForm({
  duskDomainsOnChainClient,
  marketplaceContractId,
  onOpenWalletConnection,
  selectedAddress,
  selectedAuthority,
  selectedName,
  setError,
  writes,
}: {
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

  const createListing = useCallback(async () => {
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
        await canonicalOwnedName(duskDomainsOnChainClient, selectedName, selectedAuthority)
      } catch (readError) {
        setError(userFacingErrorMessage(readError))
        return
      }
      await writes.submit(
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
    } catch (readError) {
      setError(userFacingErrorMessage(readError))
      return
    }
    await writes.submit(
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
