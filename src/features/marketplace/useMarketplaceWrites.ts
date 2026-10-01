import { useScopedState } from '../../utils/useScopedState'
import { MARKETPLACE_SYNC_MESSAGE } from './marketplacePresentation'
import type { MarketplaceReviewDetails } from './marketplaceTypes'
import { useCallback } from 'react'
import { waitForIndexerBlock } from '../../app/indexerReadHelpers'
import type { SubmitNameWrite } from '../../app/useDuskDomainWriter'
import type { LiveWritePreflight } from '../../app/useLiveWritePreflight'
import {
  userFacingErrorMessage,
  type DuskDomainCallMetadata,
  type DuskDomainsIndexerClient,
  type DuskDomainsMarketplaceOnChainClient,
  type DuskDomainsOnChainClient,
  type DuskDomainsRuntimeConfig,
  type DuskDomainTxState,
} from '../../names/internal'

export type MarketplaceFeedback = {
  setConfirmation: (message: string) => void
  setError: (message: string) => void
  setTxState: (state: DuskDomainTxState | null) => void
}

// Every marketplace write goes through here: wallet and balance checks, the wallet signature,
// then a wait for the indexer to catch up before the listings reload.
export function useMarketplaceWrites({
  actionsAvailable,
  feedbackScope,
  duskDomainsOnChainClient,
  ensurePublicBalanceForLiveWrite,
  feedback,
  indexerClient,
  loadMarketplace,
  marketplaceOnChainClient,
  onOpenWalletConnection,
  runtimeConfig,
  selectedAddress,
  submitNameWrite,
}: {
  feedbackScope: string
  actionsAvailable: boolean
  duskDomainsOnChainClient: DuskDomainsOnChainClient | null
  ensurePublicBalanceForLiveWrite: LiveWritePreflight['ensurePublicBalanceForLiveWrite']
  feedback: MarketplaceFeedback
  indexerClient: DuskDomainsIndexerClient | null
  loadMarketplace: () => Promise<void>
  marketplaceOnChainClient: DuskDomainsMarketplaceOnChainClient | null
  onOpenWalletConnection: () => void
  runtimeConfig: DuskDomainsRuntimeConfig
  selectedAddress: string
  submitNameWrite: SubmitNameWrite
}) {
  const { setConfirmation, setError, setTxState } = feedback
  const [review, setReview] = useScopedState<(MarketplaceReviewDetails & { confirm: () => Promise<unknown> }) | null>(feedbackScope, null)
  const requestReview = useCallback((details: MarketplaceReviewDetails, confirm: () => Promise<unknown>) => {
    setError('')
    setConfirmation('')
    setTxState(null)
    setReview({ ...details, confirm })
  }, [setConfirmation, setError, setReview, setTxState])
  const confirmReview = async () => {
    if (!review || !actionsAvailable) return
    setReview(null)
    await review.confirm()
  }

  const submit = useCallback(async (
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
        if (finalState.ownershipConfirmed === false) return finalState
        setConfirmation(`${successMessage} Syncing marketplace data…`)
        const height = await duskDomainsOnChainClient?.getCurrentBlockHeight()
        if (await waitForIndexerBlock(indexerClient, height?.ok ? height.value : null)) await loadMarketplace()
        else setError(MARKETPLACE_SYNC_MESSAGE)
        setConfirmation(successMessage)
      }
      return finalState
    } catch (submitError) {
      setError(userFacingErrorMessage(submitError))
      return null
    }
  }, [
    actionsAvailable,
    duskDomainsOnChainClient,
    ensurePublicBalanceForLiveWrite,
    indexerClient,
    loadMarketplace,
    onOpenWalletConnection,
    runtimeConfig.contracts,
    selectedAddress,
    setConfirmation,
    setError,
    setTxState,
    submitNameWrite,
  ])

  // Re-reads the order from the contract before acting on it, so a stale listing never
  // reaches the wallet.
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
  }, [marketplaceOnChainClient, setError])

  return { guardCanonicalRead, submit, requestReview, review, confirmReview, cancelReview: () => setReview(null) }
}

export type MarketplaceWrites = ReturnType<typeof useMarketplaceWrites>
