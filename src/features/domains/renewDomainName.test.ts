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

it('refuses escrow renewal before asking the wallet even if a stale capability allows it', async () => {
  const setRenewalError = vi.fn(), submitNameWrite = Object.assign(vi.fn(), { captureWorkspace: () => () => true })
  await renewDomainName({ canRenewName: true, managedName: { inMarketplaceEscrow: true, ownerIsContract: true },
    walletSetupState: 'connected', setRenewalError, submitNameWrite, ensureContractAuthorityForLiveWrite: vi.fn(() => false) } as never)
  expect(setRenewalError).toHaveBeenLastCalledWith('Close the marketplace listing before renewing this name.')
  expect(submitNameWrite).not.toHaveBeenCalled()
})

it('refuses contract-owned renewal until custody is known even if a stale capability allows it', async () => {
  const setRenewalError = vi.fn(), submitNameWrite = Object.assign(vi.fn(), { captureWorkspace: () => () => true })
  const ensureContractAuthorityForLiveWrite = vi.fn(() => false)
  await renewDomainName({ canRenewName: true, managedName: { inMarketplaceEscrow: null, ownerIsContract: true },
    walletSetupState: 'connected', setRenewalError, submitNameWrite, ensureContractAuthorityForLiveWrite } as never)
  expect(setRenewalError).toHaveBeenLastCalledWith('Renewal is unavailable until marketplace custody can be checked.')
  expect(ensureContractAuthorityForLiveWrite).not.toHaveBeenCalled()
  expect(submitNameWrite).not.toHaveBeenCalled()
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
