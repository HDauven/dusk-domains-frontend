import { searchActions } from '../../features/search/test-fixtures/searchActions'
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
  const submitNameWrite = Object.assign(vi.fn(), { captureWorkspace: () => () => true }), ensureContractAuthorityForLiveWrite = vi.fn(), setRecordError = vi.fn()
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
  const updateClock = vi.fn()
  const props = { ...searchActions({ search: { updateClock } }), onChainClient: { readPrimaryName: vi.fn() }, selectedAddress: 'alice-address', currentBlockHeight: null }
  function Probe() {
    hydrate = useIndexedNameHydration(props as never).hydrateNameFromIndexer
    return null
  }
  renderToStaticMarkup(createElement(Probe))
  const reads = {} as Awaited<ReturnType<typeof readIndexedName>>
  vi.mocked(readIndexedName).mockResolvedValue(reads)
  const getHealth = vi.fn().mockResolvedValue({ ok: true, currentBlockHeight: 100 })
  await hydrate({ getHealth } as never, {} as never)
  expect(updateClock).toHaveBeenCalledExactlyOnceWith(100, expect.any(Number))
  expect(applyIndexedNameHydration).toHaveBeenCalledExactlyOnceWith({ ...props, currentBlockHeight: 100, nowSeconds: expect.any(Number) }, reads)
  getHealth.mockResolvedValue({ ok: false, currentBlockHeight: 200 })
  await expect(hydrate({ getHealth } as never, {} as never)).rejects.toThrow('still syncing')
  expect(readIndexedName).toHaveBeenCalledExactlyOnceWith({ getHealth }, {}, 'alice-address', props.onChainClient)
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

it('allows a connected wallet to renew a contract-owned root during grace without granting management rights', () => {
  const ready = {
    walletSigningReady: true, selectedAddress: 'payer', selectedAuthority: 'payer',
    nodeHex: 'node', displayName: 'alice.dusk',
    managedName: { node: 'node', owner: 'contract', manager: 'contract', ownerIsContract: true, inMarketplaceEscrow: false, expiresAt: 200, graceEndsAt: 300 },
    currentBlockHeight: 250, nowSeconds: 1_790_000_000, subnameLabel: 'docs', subnameManager: '',
    subnames: [], recordDraftMutations: [], recordDraftErrors: [], pendingReservations: [],
    primaryEndpointValue: '', confirmationInput: 'alice.dusk',
  }
  const capabilities = deriveAppDerivedState(ready as never)
  expect(capabilities.canRenewName).toBe(true)
  expect(capabilities.canManageName).toBe(false)
  expect(capabilities.canCreateSubname).toBe(false)
  expect(capabilities.canSaveRecords).toBe(false)
  for (const overrides of [
    { walletSigningReady: false }, { selectedAddress: '' }, { selectedAuthority: '' },
    { currentBlockHeight: 300 }, { currentBlockHeight: null }, { displayName: 'docs.alice.dusk' },
    { managedName: { ...ready.managedName, ownerIsContract: false } },
    { managedName: { ...ready.managedName, node: 'other' } },
  ]) expect(deriveAppDerivedState({ ...ready, ...overrides } as never).canRenewName).toBe(false)
})

it('blocks escrow renewal for owners, managers and visiting contract payers', () => {
  for (const selectedAuthority of ['owner', 'manager', 'payer']) {
    const ready = {
      walletSigningReady: true, selectedAddress: 'wallet', selectedAuthority,
      nodeHex: 'node', displayName: 'alice.dusk',
      managedName: { node: 'node', owner: 'owner', manager: 'manager', ownerIsContract: true, inMarketplaceEscrow: true, expiresAt: 200, graceEndsAt: 300 },
      currentBlockHeight: 100, nowSeconds: 0, subnameLabel: '', subnameManager: '', subnames: [],
      recordDraftMutations: [], recordDraftErrors: [], pendingReservations: [], primaryEndpointValue: '', confirmationInput: '',
    }
    expect(deriveAppDerivedState(ready as never).canRenewName).toBe(false)
    expect(deriveAppDerivedState({ ...ready, managedName: { ...ready.managedName, inMarketplaceEscrow: false } } as never).canRenewName).toBe(true)
  }
})


it('requires the holder before editing records, primary names or creating children', () => {
  const ancestor = { node: 'root', name: 'alice.dusk', owner: 'ancestor', manager: 'ancestor-manager', expiresAtBlockHeight: 200 }
  const name = { node: 'child', owner: 'holder', manager: 'holder-manager', expiresAt: 200, graceEndsAt: 300, ancestors: [ancestor] }
  const ready = { walletSigningReady: true, selectedAddress: 'wallet', selectedAuthority: 'ancestor', nodeHex: 'child',
    displayName: 'docs.alice.dusk', managedName: name, activeRecordTarget: { node: 'child' },
    currentBlockHeight: 100, nowSeconds: 0, pendingReservations: [], subnames: [], primaryEndpointValue: '',
    confirmationInput: 'docs.alice.dusk', subnameLabel: 'pay', subnameManager: 'holder',
    recordDraftMutations: [{action:'set',key:'website',value:'https://test.example'}], recordDraftErrors: [] }
  for (const selectedAuthority of ['ancestor', 'ancestor-manager']) {
    expect(canManageActiveName(name, selectedAuthority, 100)).toBe(false)
    const state = deriveAppDerivedState({ ...ready, selectedAuthority } as never)
    expect(state.canCreateSubname).toBe(false)
    expect(state.canSaveRecords).toBe(false)
    expect(state.canRemoveRecords).toBe(false)
    expect(state.canSetPrimary).toBe(false)
    expect(state.canClearPrimary).toBe(false)
    const reclaimed = { ...name, owner: selectedAuthority, manager: selectedAuthority }
    expect(canManageActiveName(reclaimed, selectedAuthority, 100)).toBe(true)
    const after = deriveAppDerivedState({ ...ready, selectedAuthority, managedName: reclaimed } as never)
    expect(after.canSaveRecords).toBe(true)
    expect(after.canRemoveRecords).toBe(true)
    expect(after.canCreateSubname).toBe(true)
  }
})

it('does not authorize another holder’s records through the displayed parent', () => {
  const ready = { walletSigningReady: true, selectedAddress: 'wallet', selectedAuthority: 'owner', nodeHex: 'root',
    displayName: 'alice.dusk', managedName: { node: 'root', owner: 'owner', manager: 'owner', expiresAt: 200, graceEndsAt: 300 },
    activeRecordTarget: { node: 'child' }, subnames: [{ node:'child', owner:'holder', manager:'holder', expiresAt:200, status:'active' }],
    currentBlockHeight:100, nowSeconds:0, pendingReservations:[], primaryEndpointValue:'', confirmationInput:'alice.dusk',
    subnameLabel:'', subnameManager:'', recordDraftMutations:[{action:'set',key:'website',value:'https://test.example'}], recordDraftErrors:[] }
  const state = deriveAppDerivedState(ready as never)
  expect(state.canSaveRecords).toBe(false)
  expect(state.canRemoveRecords).toBe(false)
})


it('requires name authority to set primary but only endpoint control to clear it', () => {
  const address = '24bfNr8MDUo5xJBecmeGzXDEraax4Cmbnhjyyt5GaL1Vbe6H48ZSYTpmjRDcFRDFzgzuePAPUNcdGMnBzBQBk4zAMgBCtPsY27tBJtKmB1st6qcmpzRR4Er5imxrzvMRnfWc'
  const name = {node:'child',owner:'holder',manager:'holder',expiresAt:200,graceEndsAt:300,
    ancestors:[{node:'root',name:'alice.dusk',owner:'ancestor',manager:'ancestor',expiresAtBlockHeight:200}]}
  const ready = {walletSigningReady:true,selectedAddress:address,selectedAuthority:'ancestor',nodeHex:'child',displayName:'docs.alice.dusk',
    managedName:name,moonlightRecord:{key:'moonlight_address',value:address},primaryName:'docs.alice.dusk',connectedPrimaryName:'docs.alice.dusk',primaryEndpointValue:address,
    currentBlockHeight:100,nowSeconds:0,pendingReservations:[],subnames:[],subnameLabel:'',subnameManager:'',confirmationInput:'',recordDraftMutations:[],recordDraftErrors:[]}
  const before = deriveAppDerivedState(ready as never)
  expect(before.primaryVerification.verified).toBe(true)
  expect(before.canSetPrimary).toBe(false)
  expect(before.canClearPrimary).toBe(true)
  const after = deriveAppDerivedState({...ready,managedName:{...name,owner:'ancestor',manager:'ancestor'}} as never)
  expect(after.canSetPrimary).toBe(true)
  expect(after.canClearPrimary).toBe(true)
})
