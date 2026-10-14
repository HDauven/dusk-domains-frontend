// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createDuskDomainsRuntimeConfig, namehashHex, type IndexedNameSummary } from '../../names/internal'
import { handoffEnv } from '../../test/handoffFixtures'
import { account } from '../../test/frozenFixtures'
import { useMarketplaceFeature } from './useMarketplaceFeature'

const seller = `0x${'22'.repeat(32)}`
const name = { node: namehashHex('aurora.dusk'), canonicalName: 'aurora.dusk', owner: seller, manager: seller, status: 'active', records: [], namespace: [] } as unknown as IndexedNameSummary
const data = { ownedNames: [name], auctions: [], fixedSales: [], offers: [], refunds: [], feeBps: 250, feeStatus: 'known', marketplaces: null, hasData: true, readError: '', loading: false, hasMore: false,
  updatedAt: 1, currentBlockHeight: 100, auctionPollingEnabled: false, loadMarketplace: vi.fn(async () => {}), loadMore: vi.fn() }
vi.mock('./useMarketplaceData', () => ({ useMarketplaceData: () => data }))
vi.mock('./canonicalMarketplaceState', async original => ({
  ...await original<typeof import('./canonicalMarketplaceState')>(),
  canonicalOwnedName: vi.fn(async () => ({ currentBlockHeight: 100, ref: null })),
  canonicalOfferTarget: vi.fn(async () => ({ currentBlockHeight: 100, ref: null })),
  canonicalOfferAbsent: vi.fn(async () => {}),
}))

// The market this build was configured with, and the one the directory prefers now, after a
// SetPreferredMarketplace that anyone could execute once it was ready.
const runtimeConfig = createDuskDomainsRuntimeConfig({ ...handoffEnv, VITE_DUSK_DOMAINS_INDEXER_URL: '/api', VITE_DUSK_DOMAINS_ENABLE_LIVE_WRITES: 'true', VITE_DUSK_DOMAINS_ENABLE_MARKETPLACE: 'true' })
const configured = runtimeConfig.contracts.marketplace!.contractId
const preferred = `0x${'0c'.repeat(32)}`

let root: Root
let feature: ReturnType<typeof useMarketplaceFeature>
const submitNameWrite = Object.assign(vi.fn(async () => ({ status: 'rejected' })), { captureSession: () => () => true, captureWorkspace: () => () => true })
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  root = createRoot(document.createElement('div'))
  submitNameWrite.mockClear()
})
afterEach(async () => { await act(async () => root.unmount()); vi.unstubAllGlobals() })

async function render(preferredMarketplace: string | null) {
  function Probe() {
    feature = useMarketplaceFeature({
      tradingPaused: false, ensurePublicBalanceForLiveWrite: async () => true, indexerClient: null,
      duskDomainsOnChainClient: { getCurrentBlockHeight: async () => ({ ok: true, value: 100 }) } as never, liveWritesAvailable: true,
      marketplaceOnChainClient: {} as never, mainView: 'marketplace', onOpenWalletConnection: vi.fn(), runtimeConfig,
      selectedAddress: account, selectedAuthority: seller, submitNameWrite: submitNameWrite as never, preferredMarketplace,
    })
    return null
  }
  await act(async () => root.render(<Probe />))
}
// The view's buttons open a review first; confirming it calls these with reviewed set.
const reviewed = (action: () => unknown) => (action as (reviewed: boolean) => Promise<void>)(true)
const submitted = () => submitNameWrite.mock.calls.map(call => (call as unknown[])[1] as { functionName: string, contractId?: string, args: { marketplaceContract?: string } })

it('places new listings and offers at the market the directory prefers now, not the one this build was configured with', async () => {
  expect(preferred).not.toBe(configured)
  await render(preferred)
  await act(async () => { await reviewed(feature.marketplaceProps.selling.onCreateListing) })
  await act(async () => { feature.marketplaceProps.offers.onOfferNameChange('other.dusk') })
  await act(async () => { await reviewed(feature.marketplaceProps.offers.onPlaceOffer) })
  expect(submitted().map(call => [call.functionName, call.args.marketplaceContract ?? call.contractId])).toEqual([
    ['escrow_fixed_sale', preferred],
    ['place_offer', preferred],
  ])
})

it('refuses a new order plainly while the preferred market can’t be read', async () => {
  await render(null)
  await act(async () => { await reviewed(feature.marketplaceProps.selling.onCreateListing) })
  expect(submitNameWrite).not.toHaveBeenCalled()
  expect(feature.marketplaceProps.feedback.error).toBe('The market can’t be reached right now. Try again in a moment.')
})
