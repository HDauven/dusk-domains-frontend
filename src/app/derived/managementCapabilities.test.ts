import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { canManageActiveName } from './managementCapabilities'
import { deriveRecordCapabilities } from './recordCapabilities'
import { deriveAppDerivedState } from './deriveAppDerivedState'
import { clearDomainRecord } from '../../features/domains/clearDomainRecord'
import { useIndexedNameHydration } from '../../features/search/useIndexedNameHydration'
import { readIndexedName } from '../../features/search/indexedNameReads'
import { applyIndexedNameHydration } from '../../features/search/applyIndexedNameHydration'

vi.mock('../../features/search/indexedNameReads', () => ({ readIndexedName: vi.fn() }))
vi.mock('../../features/search/applyIndexedNameHydration', () => ({ applyIndexedNameHydration: vi.fn() }))

it('limits active name actions to that target’s owner or manager, and blocks removal before a wallet call', async () => {
  const parent = { owner: 'owner', manager: 'manager', expiresAt: 200 }
  expect(canManageActiveName(parent, 'OWNER', 100)).toBe(true)
  expect(canManageActiveName(parent, 'manager', 100)).toBe(true)
  expect(canManageActiveName(parent, 'other', 100)).toBe(false)
  expect(canManageActiveName(parent, '', 100)).toBe(false)
  expect(canManageActiveName(parent, 'owner', 200)).toBe(false)
  expect(canManageActiveName(parent, 'owner', null)).toBe(false)
  expect(canManageActiveName(undefined, 'owner', 100)).toBe(false)
  const child = { ...parent, owner: 'child-owner', manager: 'child-manager' }
  expect(canManageActiveName(child, 'owner', 100)).toBe(false)
  expect(canManageActiveName(child, 'child-manager', 100)).toBe(true)
  const submitNameWrite = vi.fn(), ensureContractAuthorityForLiveWrite = vi.fn(), setRecordError = vi.fn()
  await clearDomainRecord({ activeRecordTarget: { name: 'name.dusk', node: 'node' }, canRemoveRecords: false,
    walletSetupState: 'connected', walletAuthorized: true, selectedAddress: 'owner', recordBusy: false,
    setRecordError, submitNameWrite, ensureContractAuthorityForLiveWrite } as never,
  { key: 'website' } as never)
  expect(submitNameWrite).not.toHaveBeenCalled()
  expect(ensureContractAuthorityForLiveWrite).not.toHaveBeenCalled()
  expect(setRecordError).toHaveBeenLastCalledWith('Connect the manager wallet before removing this record.')
})

it('refreshes unknown height before applying lifecycle state and refuses unhealthy hydration', async () => {
  let hydrate!: ReturnType<typeof useIndexedNameHydration>['hydrateNameFromIndexer']
  const setCurrentBlockHeight = vi.fn()
  const props = { currentBlockHeight: null, setCurrentBlockHeight, beginActivityRead: () => () => true }
  function Probe() {
    hydrate = useIndexedNameHydration(props as never).hydrateNameFromIndexer
    return null
  }
  renderToStaticMarkup(createElement(Probe))
  const reads = {} as Awaited<ReturnType<typeof readIndexedName>>
  vi.mocked(readIndexedName).mockResolvedValue(reads)
  const getHealth = vi.fn().mockResolvedValue({ ok: true, currentBlockHeight: 100 })
  await hydrate({ getHealth } as never, {} as never)
  expect(setCurrentBlockHeight).toHaveBeenCalledExactlyOnceWith(100)
  expect(applyIndexedNameHydration).toHaveBeenCalledExactlyOnceWith({ ...props, currentBlockHeight: 100 }, reads)
  getHealth.mockResolvedValue({ ok: false, currentBlockHeight: 200 })
  await expect(hydrate({ getHealth } as never, {} as never)).rejects.toThrow('still syncing')
  expect(readIndexedName).toHaveBeenCalledOnce()
  expect(applyIndexedNameHydration).toHaveBeenCalledOnce()
})

it('allows owner and manager renewal until grace ends, but never subname renewal', () => {
  const managedName = { owner: 'owner', manager: 'manager', expiresAt: 200, graceEndsAt: 300 }
  const ready = { walletAuthorized: true, selectedAddress: 'wallet', selectedAuthority: 'owner', nodeHex: 'node', renewalBusy: false,
    displayName: 'alphavnuc.dusk', managedName, currentBlockHeight: 100 as number | null, nowSeconds: 0,
    subnameLabel: '', subnameManager: '', primaryEndpointErrors: [], recordDraftMutations: [], recordDraftErrors: [] }
  const canRenew = (overrides: Partial<typeof ready> = {}) => (
    deriveRecordCapabilities({ ...ready, ...overrides } as never).canRenewName
  )
  for (const selectedAuthority of ['OWNER', 'manager']) {
    for (const currentBlockHeight of [199, 200, 201, 299]) {
      expect(canRenew({ selectedAuthority, currentBlockHeight })).toBe(true)
    }
    expect(canRenew({ selectedAuthority, currentBlockHeight: 300 })).toBe(false)
  }
  expect(canRenew({ selectedAuthority: 'stranger', currentBlockHeight: 201 })).toBe(false)
  expect(canRenew({ displayName: 'pay.alphavnuc.dusk' })).toBe(false)
  expect(canRenew({ walletAuthorized: false })).toBe(false)
  expect(canRenew({ renewalBusy: true })).toBe(false)
  expect(canRenew({ managedName: { ...managedName, graceEndsAt: 0 }, currentBlockHeight: 200 })).toBe(true)
  const unixLifecycle = { managedName: { ...managedName, expiresAt: 1_800_000_000, graceEndsAt: 1_802_592_000 }, currentBlockHeight: null }
  expect(canRenew({ ...unixLifecycle, nowSeconds: 1_800_000_000 })).toBe(true)
  expect(canRenew({ ...unixLifecycle, nowSeconds: 1_802_592_000 })).toBe(false)
})

it('derives a missing grace end from expiry and closes renewal exactly at that block', () => {
  const ready = { walletAuthorized: true, selectedAddress: 'wallet', selectedAuthority: 'owner', nodeHex: 'node',
    displayName: 'alphavnuc.dusk', managedName: { node: 'node', owner: 'owner', manager: 'manager', expiresAt: 200, graceEndsAt: 0 },
    nowSeconds: 1_790_000_000, subnameLabel: '', subnameManager: '', primaryEndpointErrors: [], recordDraftMutations: [], recordDraftErrors: [] }
  for (const selectedAuthority of ['owner', 'manager']) {
    for (const currentBlockHeight of [200, 259_399, 259_400]) {
      expect(deriveRecordCapabilities({ ...ready, selectedAuthority, currentBlockHeight } as never).canRenewName)
        .toBe(currentBlockHeight < 259_400)
    }
  }
})

it.each([0, 1_802_592_000])('leaves an hour before a date-only grace end of %s', (graceEndsAt) => {
  const ready = { walletAuthorized: true, selectedAddress: 'wallet', selectedAuthority: 'owner', nodeHex: 'node',
    displayName: 'alphavnuc.dusk', managedName: { node: 'node', owner: 'owner', manager: 'manager', expiresAt: 1_800_000_000, graceEndsAt },
    subnameLabel: '', subnameManager: '', primaryEndpointErrors: [], recordDraftMutations: [], recordDraftErrors: [] }
  for (const currentBlockHeight of [null, 1_000]) {
    for (const nowSeconds of [1_802_588_399, 1_802_588_400, 1_802_591_999, 1_802_592_000]) {
      expect(deriveRecordCapabilities({ ...ready, currentBlockHeight, nowSeconds } as never).canRenewName)
        .toBe(nowSeconds < 1_802_588_400)
    }
  }
})

it('keeps a prepaid name renewable when its grace end exceeds 100 million blocks', () => {
  const ready = { walletAuthorized: true, selectedAddress: 'wallet', selectedAuthority: 'owner', nodeHex: 'node',
    displayName: 'alphavnuc.dusk', managedName: { node: 'node', owner: 'owner', manager: 'manager', expiresAt: 100_000_000, graceEndsAt: 100_259_200 },
    nowSeconds: 1_790_000_000, subnameLabel: '', subnameManager: '', primaryEndpointErrors: [], recordDraftMutations: [], recordDraftErrors: [] }
  for (const currentBlockHeight of [1_000_000, 100_259_199, 100_259_200]) {
    expect(deriveRecordCapabilities({ ...ready, currentBlockHeight } as never).canRenewName)
      .toBe(currentBlockHeight < 100_259_200)
  }
})

it('keeps grace renewal available through the app while other management stays closed', () => {
  const ready = { walletSigningReady: true, selectedAddress: 'wallet', selectedAuthority: 'owner', nodeHex: 'node',
    displayName: 'alphavnuc.dusk', managedName: { node: 'node', owner: 'owner', manager: 'manager', expiresAt: 200, graceEndsAt: 300 },
    currentBlockHeight: 201, nowSeconds: 0, pendingReservations: [], subnames: [], primaryEndpointValue: '',
    confirmationInput: 'alphavnuc.dusk', subnameLabel: 'pay', subnameManager: 'owner',
    recordDraftMutations: [], recordDraftErrors: [] }
  for (const selectedAuthority of ['owner', 'manager', 'stranger']) {
    const state = deriveAppDerivedState({ ...ready, selectedAuthority } as never)
    expect(state.canRenewName).toBe(selectedAuthority !== 'stranger')
    expect(state.canManageName).toBe(false)
    expect(state.canCreateSubname).toBe(false)
    expect(state.canSetPrimary).toBe(false)
  }
  expect(deriveAppDerivedState({ ...ready, currentBlockHeight: 300 } as never).canRenewName).toBe(false)
  expect(deriveAppDerivedState({ ...ready, currentBlockHeight: null } as never).canRenewName).toBe(false)
})
