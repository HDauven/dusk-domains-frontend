import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { createDuskDomainsOnChainReadTransport, createDuskDomainsRuntimeConfig } from '../names/internal'
import { SearchResultPanel, type SearchResultPanelProps } from '../features/search/SearchResultPanel'
import { deriveAppDerivedState } from './derived/deriveAppDerivedState'
import { readPoolMarketplace } from './poolMarketplace'
import { useAppCoreRuntimes } from './useAppCoreRuntimes'

const marketplace = `0x${'ab'.repeat(32)}`
const env = {
  VITE_DUSK_DOMAINS_ROUTER_CONTRACT_ID: `0x${'11'.repeat(32)}`,
  VITE_DUSK_DOMAINS_ENABLE_MARKETPLACE: 'false',
  VITE_DUSK_DOMAINS_MARKETPLACE_CONTRACT_ID: marketplace,
}
const runtime = { runtimeConfig: createDuskDomainsRuntimeConfig(env), marketplaceContractId: null as string | null }
let owner = marketplace

vi.mock('./useAppRuntime', () => ({ useAppRuntime: () => runtime }))
vi.mock('./useWalletRuntime', () => ({ useWalletRuntime: () => ({}) }))
vi.mock('./useEconomicsRuntime', () => ({ useEconomicsRuntime: () => ({}) }))
vi.mock('./useContractOwner', () => ({ useContractOwner: () => true }))
vi.mock('./managedNameState', async importOriginal => {
  const original = await importOriginal<typeof import('./managedNameState')>()
  return { ...original, createManagedNameState: () => ({ ...original.createManagedNameState('resolver'),
    node: 'node', owner, manager: owner, expiresAt: 200, graceEndsAt: 300 }) }
})

function renderRenewal() {
  let canRenew = false
  let escrow: boolean | null | undefined
  function Probe() {
    const { domainState: { managedName } } = useAppCoreRuntimes(env)
    escrow = managedName.inMarketplaceEscrow
    const capabilities = deriveAppDerivedState({
      walletSigningReady: true, selectedAddress: 'payer', selectedAuthority: 'payer',
      nodeHex: 'node', displayName: 'alice.dusk', managedName,
      currentBlockHeight: 250, nowSeconds: 1_790_000_000, subnameLabel: '', subnameManager: '',
      subnames: [], recordDraftMutations: [], recordDraftErrors: [], pendingReservations: [],
      primaryEndpointValue: '', confirmationInput: '',
    } as never)
    canRenew = capabilities.canRenewName
    return <SearchResultPanel {...{
      headerProps: { status: 'registered', displayName: 'alice.dusk', records: [], viewerAuthority: 'payer' },
      settingsProps: { ...capabilities, managedName, displayName: 'alice.dusk', currentBlockHeight: 250,
        nowSeconds: 1_790_000_000, renewalYears: 1, minDurationYears: 1, maxDurationYears: 10,
        renewalFee: 10, renewalPreviewExpiresAt: 3_153_800 },
      detailsProps: { displayName: 'alice.dusk', parentResolverRecords: [], activityEntries: [], subnames: [], primaryVerification: { tone: 'muted' } },
      subdomainsProps: { subnames: [] }, overviewProps: { canRegister: false }, nodeHex: 'node', resultView: 'manage',
    } as unknown as SearchResultPanelProps} />
  }
  const html = renderToStaticMarkup(<Probe />)
  return { canRenew, escrow, html }
}

it('hides Renew for marketplace custody with marketplace UI disabled, then permits renewal outside escrow', async () => {
  expect(runtime.runtimeConfig.capabilities.marketplace).toBe(false)
  expect(runtime.runtimeConfig.contracts.marketplace).toBeUndefined()
  const readContract = vi.fn().mockResolvedValue({ output: { marketplace: Array(32).fill(0xab) }, fnName: 'config' })
  runtime.marketplaceContractId = await readPoolMarketplace(createDuskDomainsOnChainReadTransport({ readContract } as never, runtime.runtimeConfig.contracts))
  expect(readContract).toHaveBeenCalledWith(expect.objectContaining({ contract: runtime.runtimeConfig.contracts.router, functionName: 'config' }))
  owner = marketplace
  const escrowed = renderRenewal()
  expect(escrowed.canRenew).toBe(false)
  expect(escrowed.escrow).toBe(true)
  expect(escrowed.html).not.toContain('>Renew</')
  expect(escrowed.html).not.toContain('aria-label="Renewal controls"')
  owner = `0x${'cd'.repeat(32)}`
  const closed = renderRenewal()
  expect(closed.canRenew).toBe(true)
  expect(closed.html).toContain('aria-label="Renewal controls"')
})

it('hides Renew for a contract-owned name while the pool identity is unknown', () => {
  runtime.marketplaceContractId = null
  owner = `0x${'cd'.repeat(32)}`
  const pending = renderRenewal()
  expect(pending.canRenew).toBe(false)
  expect(pending.html).not.toContain('>Renew</')
  expect(pending.html).not.toContain('aria-label="Renewal controls"')
})
