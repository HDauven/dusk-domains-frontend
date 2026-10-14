import { expect, it, vi } from 'vitest'
import { DEFAULT_FEE_CONFIG } from '../../names/internal'
import { renewDomainName } from './renewDomainName'

// Renewals are priced by the directory's renewal schedule, which a registration policy replacement leaves alone.
const schedule = { threeChar: 150_000_000_000, fourChar: 50_000_000_000, fivePlus: 10_000_000_000 }

it('asks for the owner or manager when renewal is unavailable', async () => {
  const setRenewalError = vi.fn(), submitNameWrite = Object.assign(vi.fn(), { captureWorkspace: () => () => true })
  await renewDomainName({ canRenewName: false, walletSetupState: 'connected', setRenewalError, submitNameWrite } as never)
  expect(setRenewalError).toHaveBeenLastCalledWith('Connect the owner or manager wallet before renewing this name.')
  expect(submitNameWrite).not.toHaveBeenCalled()
})

it('renews a contract-owned name from a third-party wallet and preserves its state', async () => {
  const owner = 'contract', payer = 'payer'
  const managedName = { node: 'node', owner, manager: 'manager', resolver: 'resolver', ownerIsContract: true, inMarketplaceEscrow: false, expiresAt: 200, graceEndsAt: 300 }
  const setManagedName = vi.fn(), appendActivity = vi.fn(), setRenewalError = vi.fn()
  const submitNameWrite = Object.assign(vi.fn(async () => ({ status: 'executed', txId: 'renewal' })), { captureWorkspace: () => () => true })
  await renewDomainName({ canRenewName: true, walletSetupState: 'connected', displayName: 'alice.dusk', nodeHex: 'node',
    feeConfig: { ...DEFAULT_FEE_CONFIG, renewalYearLux: schedule },
    managedName, selectedAuthority: payer, resultLabel: 'alice', renewalYears: 1, currentBlockHeight: 250, nowSeconds: 1_790_000_000,
    runtimeConfig: { contracts: {} }, setRenewalError, setRenewalTxState: vi.fn(), setManagedName, appendActivity,
    submitNameWrite, ensureContractAuthorityForLiveWrite: () => true, ensurePublicBalanceForLiveWrite: async () => true,
    shouldApplyPreviewWriteFallback: async () => true,
  } as never)
  expect(submitNameWrite).toHaveBeenCalledWith('alice.dusk', expect.objectContaining({ functionName: 'renew', args: { node: 'node', durationYears: 1, feeLux: 10_000_000_000 } }), expect.anything())
  expect(setManagedName.mock.calls[0][0](managedName)).toMatchObject({ owner, manager: 'manager', resolver: 'resolver', expiresAt: 3_153_800 })
  expect(appendActivity).toHaveBeenCalledWith(expect.objectContaining({ actor: payer, eventType: 'renewal' }))
  expect(setRenewalError).toHaveBeenCalledExactlyOnceWith('')
})

// Anyone can renew a listed name before its grace ends. The renewal leaves the listing, the escrow
// and the records as they are, and doesn't extend the order's own deadline.
it.each([['listed', true], ['held by a contract whose custody isn’t checked yet', null]] as const)('renews a name %s', async (_, inMarketplaceEscrow) => {
  const market = `0x${'05'.repeat(32)}`, payer = 'payer'
  const managedName = { node: 'node', owner: market, manager: market, resolver: 'resolver', ownerIsContract: true, inMarketplaceEscrow, expiresAt: 200, graceEndsAt: 300 }
  const setRenewalError = vi.fn(), setManagedName = vi.fn()
  const submitNameWrite = Object.assign(vi.fn(async () => ({ status: 'executed', txId: 'renewal' })), { captureWorkspace: () => () => true })
  const renewalListing = inMarketplaceEscrow ? { marketplace: market, orderId: '12' } : null
  await renewDomainName({ canRenewName: true, walletSetupState: 'connected', displayName: 'alice.dusk', nodeHex: 'node',
    feeConfig: { ...DEFAULT_FEE_CONFIG, renewalYearLux: schedule }, renewalListing,
    managedName, selectedAuthority: payer, resultLabel: 'alice', renewalYears: 1, currentBlockHeight: 250, nowSeconds: 1_790_000_000,
    runtimeConfig: { contracts: {} }, setRenewalError, setRenewalTxState: vi.fn(), setManagedName, appendActivity: vi.fn(),
    submitNameWrite, ensureContractAuthorityForLiveWrite: () => true, ensurePublicBalanceForLiveWrite: async () => true,
    shouldApplyPreviewWriteFallback: async () => true,
  } as never)
  // The renewal is bound to the owner and the listing it was offered for; preparation reads both again.
  expect(submitNameWrite).toHaveBeenCalledWith('alice.dusk', expect.objectContaining({ functionName: 'renew',
    reviewedRenewal: { owner: market, listing: renewalListing } }), expect.anything())
  expect(setRenewalError).toHaveBeenCalledExactlyOnceWith('')
  // The market still holds it: only the expiry moves.
  expect(setManagedName.mock.calls[0][0](managedName)).toMatchObject({ owner: market, manager: market, inMarketplaceEscrow, expiresAt: 3_153_800 })
})

it('asks to try again when a listed name’s listing can’t be read, instead of renewing it unbound', async () => {
  const market = `0x${'05'.repeat(32)}`
  const setRenewalError = vi.fn()
  const submitNameWrite = Object.assign(vi.fn(async () => ({ status: 'executed', txId: 'renewal' })), { captureWorkspace: () => () => true })
  await renewDomainName({ canRenewName: true, walletSetupState: 'connected', displayName: 'alice.dusk', nodeHex: 'node',
    feeConfig: { ...DEFAULT_FEE_CONFIG, renewalYearLux: schedule }, renewalListing: null,
    managedName: { node: 'node', owner: market, manager: market, resolver: 'resolver', ownerIsContract: true, inMarketplaceEscrow: true, expiresAt: 200, graceEndsAt: 300 },
    selectedAuthority: 'payer', resultLabel: 'alice', renewalYears: 1, currentBlockHeight: 250, nowSeconds: 1_790_000_000,
    runtimeConfig: { contracts: {} }, setRenewalError, setRenewalTxState: vi.fn(), setManagedName: vi.fn(), appendActivity: vi.fn(),
    submitNameWrite, ensureContractAuthorityForLiveWrite: () => true, ensurePublicBalanceForLiveWrite: async () => true,
    shouldApplyPreviewWriteFallback: async () => true,
  } as never)
  expect(submitNameWrite).not.toHaveBeenCalled()
  expect(setRenewalError).toHaveBeenLastCalledWith('This name’s listing can’t be read right now. Try again in a moment.')
})

it('renews the holder’s own name without a reviewed basis', async () => {
  const { renew, submitNameWrite } = renewal({ ...DEFAULT_FEE_CONFIG, renewalYearLux: schedule })
  await renew()
  expect(submitNameWrite.mock.calls[0][1]).not.toHaveProperty('reviewedRenewal')
})

function renewal(feeConfig: typeof DEFAULT_FEE_CONFIG) {
  const setRenewalError = vi.fn()
  const submitNameWrite = Object.assign(vi.fn(async () => ({ status: 'executed', txId: 'renewal' })), { captureWorkspace: () => () => true })
  const renew = () => renewDomainName({ canRenewName: true, walletSetupState: 'connected', displayName: 'alice.dusk', nodeHex: 'node', feeConfig,
    managedName: { node: 'node', owner: 'owner', manager: 'owner', resolver: 'resolver', ownerIsContract: false, inMarketplaceEscrow: false, expiresAt: 200, graceEndsAt: 300 },
    selectedAuthority: 'owner', resultLabel: 'alice', renewalYears: 2, currentBlockHeight: 250, nowSeconds: 1_790_000_000,
    runtimeConfig: { contracts: {} }, setRenewalError, setRenewalTxState: vi.fn(), setManagedName: vi.fn(), appendActivity: vi.fn(),
    submitNameWrite, ensureContractAuthorityForLiveWrite: () => true, ensurePublicBalanceForLiveWrite: async () => true,
    shouldApplyPreviewWriteFallback: async () => false,
  } as never)
  return { renew, setRenewalError, submitNameWrite }
}

it('prices a renewal without a live quote from the renewal schedule, never from the registration prices', async () => {
  // A replacement policy raised registration for five or more characters to 15 DUSK; renewal stays 8 DUSK a year.
  const { renew, submitNameWrite } = renewal({ ...DEFAULT_FEE_CONFIG, fivePlusYearLux: 15_000_000_000,
    renewalYearLux: { ...schedule, fivePlus: 8_000_000_000 } })
  await renew()
  expect(submitNameWrite).toHaveBeenCalledWith('alice.dusk', expect.objectContaining({ functionName: 'renew',
    args: { node: 'node', durationYears: 2, feeLux: 16_000_000_000 } }), expect.anything())
})

it('refuses to guess a renewal price without a live quote or the renewal schedule', async () => {
  const { renew, setRenewalError, submitNameWrite } = renewal(DEFAULT_FEE_CONFIG)
  await renew()
  expect(submitNameWrite).not.toHaveBeenCalled()
  expect(setRenewalError).toHaveBeenLastCalledWith('The renewal price is unavailable right now. Try again in a moment.')
})

it('refuses, with a reason, a live renewal quote above the exact number range instead of throwing', async () => {
  const setRenewalError = vi.fn()
  const submitNameWrite = Object.assign(vi.fn(async () => ({ status: 'executed', txId: 'renewal' })), { captureWorkspace: () => () => true })
  const quote = { total_lux: '9007199254740993', new_expiry: 9000n, new_grace_end: 10000n, schedule_version: 1n }
  await expect(renewDomainName({ canRenewName: true, walletSetupState: 'connected', displayName: 'alice.dusk', nodeHex: 'node',
    feeConfig: { ...DEFAULT_FEE_CONFIG, renewalYearLux: schedule }, renewalQuote: quote,
    managedName: { node: 'node', owner: 'owner', manager: 'owner', resolver: 'resolver', ownerIsContract: false, inMarketplaceEscrow: false, expiresAt: 200, graceEndsAt: 300 },
    selectedAuthority: 'owner', resultLabel: 'alice', renewalYears: 1, currentBlockHeight: 250, nowSeconds: 1_790_000_000,
    runtimeConfig: { contracts: {} }, setRenewalError, setRenewalTxState: vi.fn(), setManagedName: vi.fn(), appendActivity: vi.fn(),
    submitNameWrite, ensureContractAuthorityForLiveWrite: () => true, ensurePublicBalanceForLiveWrite: async () => true,
    shouldApplyPreviewWriteFallback: async () => true,
  } as never)).resolves.toBeUndefined()
  expect(submitNameWrite).not.toHaveBeenCalled()
  expect(setRenewalError).toHaveBeenLastCalledWith('This renewal’s price is higher than this site can handle.')
})
