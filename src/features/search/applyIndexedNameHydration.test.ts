import { searchActions } from './test-fixtures/searchActions'
import { expect, it, vi } from 'vitest'
import { createManagedNameState, type ManagedNameState } from '../../app/managedNameState'
import { applyIndexedNameHydration } from './applyIndexedNameHydration'
import { readIndexedName, type IndexedNameReadBundle } from './indexedNameReads'
import { deriveRecordCapabilities } from '../../app/derived/recordCapabilities'

function hydrate(managedName: ManagedNameState, stateValue: object, subnameValue: object | null) {
  let managed = managedName
  const actions = searchActions({ domain: { hydrate: snapshot => { managed = snapshot.managedName } } })
  applyIndexedNameHydration({ ...actions, currentBlockHeight: 1_000, nowSeconds: 1_790_000_000,
    recordSourceContractId: 'resolver' } as never, {
    activityRead: { value: [], error: null }, forwardRead: { value: null, error: 'not found' },
    hydratedSubnames: [], node: 'node', ownSubnameRead: { value: subnameValue, error: null }, primaryName: null,
    readErrors: [], stateRead: { value: { owner: 'owner', manager: 'owner', resolverId: 'resolver', ...stateValue }, error: null },
    subnameRecordSets: {},
  } as unknown as IndexedNameReadBundle)
  return managed
}

it('shows only the dates the index reports and takes a subname’s expiry policy', () => {
  const placeholder = createManagedNameState('resolver')
  const subname = { expiresAt: null, expiresAtBlockHeight: 20_000, graceEndsAt: null, graceEndsAtBlockHeight: null }
  expect(hydrate(placeholder, subname, { expiryPolicy: 'inherits_parent' }))
    .toMatchObject({ expiresAt: 20_000, graceEndsAt: 0, expiryPolicy: 'inherits_parent' })
  expect(hydrate(placeholder, { ...subname, graceEndsAtBlockHeight: 30_000 }, { expiryPolicy: 'fixed_before_parent' }))
    .toMatchObject({ expiresAt: 20_000, graceEndsAt: 30_000, expiryPolicy: 'fixed_before_parent' })
  const earlier = { ...placeholder, expiresAt: 5_000, graceEndsAt: 6_000, expiryPolicy: 'inherits_parent' as const }
  expect(hydrate(earlier, { ...subname, expiresAtBlockHeight: null }, null))
    .toMatchObject({ expiresAt: 0, graceEndsAt: 0, expiryPolicy: null })
})

it('reads a name’s own subname entry only for a subname', async () => {
  const client = {
    resolveForward: vi.fn(async () => ({ records: [] })), getNameState: vi.fn(async () => null),
    getActivityPage: vi.fn(async () => ({ activity: [], nextCursor: 'next' })), getAllSubnames: vi.fn(async () => []),
    getSubname: vi.fn(async () => ({ expiryPolicy: 'inherits_parent' })),
  }
  const root = await readIndexedName(client as never, { canonical: 'alphavnuc.dusk' } as never)
  expect(root?.activityCursor).toBe('next')
  expect(client.getAllSubnames).toHaveBeenCalledExactlyOnceWith(root?.node)
  expect(client.getSubname).not.toHaveBeenCalled()
  expect(root?.ownSubnameRead).toEqual({ value: null, error: null })
  const subname = await readIndexedName(client as never, { canonical: 'pay.alphavnuc.dusk' } as never)
  expect(client.getSubname).toHaveBeenCalledExactlyOnceWith(subname?.node)
  expect(subname?.ownSubnameRead.value).toEqual({ expiryPolicy: 'inherits_parent' })
})

it.each([null, '2027-02-14T08:00:00.000Z'])('preserves date-only grace estimates for the renewal margin with grace end %s', (graceEndsAt) => {
  const managedName = hydrate(createManagedNameState('resolver'), {
    expiresAt: new Date(1_800_000_000 * 1000).toISOString(), expiresAtBlockHeight: null,
    graceEndsAt, graceEndsAtBlockHeight: null,
  }, null)
  expect(managedName.expiresAt).toBe(1_001_000)
  expect(managedName.graceEndsAt).toBe(1_802_592_000)
  for (const nowSeconds of [1_802_588_399, 1_802_588_400]) {
    expect(deriveRecordCapabilities({ managedName, nowSeconds, currentBlockHeight: 1_000,
      displayName: 'alphavnuc.dusk', walletAuthorized: true, selectedAddress: 'wallet', selectedAuthority: 'owner',
      nodeHex: 'node', subnameLabel: '', subnameManager: '', primaryEndpointErrors: [], recordDraftMutations: [], recordDraftErrors: [],
    } as never).canRenewName).toBe(nowSeconds < 1_802_588_400)
  }
})

it('uses block expiry to derive missing grace heights instead of trusting an indexed date', () => {
  const managedName = hydrate(createManagedNameState('resolver'), {
    expiresAt: '2027-01-15T08:00:00.000Z', expiresAtBlockHeight: 200,
    graceEndsAt: '2027-02-14T08:00:00.000Z', graceEndsAtBlockHeight: null,
  }, null)
  expect(managedName).toMatchObject({ expiresAt: 200, graceEndsAt: 0 })
  for (const currentBlockHeight of [259_399, 259_400]) {
    expect(deriveRecordCapabilities({ managedName, currentBlockHeight, nowSeconds: 1_790_000_000,
      displayName: 'alphavnuc.dusk', walletAuthorized: true, selectedAddress: 'wallet', selectedAuthority: 'owner',
      nodeHex: 'node', subnameLabel: '', subnameManager: '', primaryEndpointErrors: [], recordDraftMutations: [], recordDraftErrors: [],
    } as never).canRenewName).toBe(currentBlockHeight < 259_400)
  }
})

it('hydrates the named owner and manager for an issued reserved root', () => {
  expect(hydrate(createManagedNameState('resolver'), {
    canonicalName: 'wallet.dusk', owner: 'foundation', manager: 'wallet-team',
    issuedAsReserved: true, expiresAt: null, expiresAtBlockHeight: 20_000,
    graceEndsAt: null, graceEndsAtBlockHeight: 30_000,
  }, null)).toMatchObject({ owner: 'foundation', manager: 'wallet-team', expiresAt: 20_000 })
})

it('reads records only for the opened name, even when it has many subnames', async () => {
  const client = {
    resolveForward: vi.fn(async (name: string) => {
      if (name !== 'parent.dusk') throw new Error('Child records should load from their own pages')
      return { records: [] }
    }),
    getNameState: async () => null,
    getActivityPage: async () => ({ activity: [], nextCursor: null }),
    getAllSubnames: async () => Array.from({ length: 60 }, (_, index) => ({ name: `child${index}.parent.dusk`, node: `child${index}` })),
  }
  const reads = await readIndexedName(client as never, { canonical: 'parent.dusk' } as never)
  expect(client.resolveForward).toHaveBeenCalledExactlyOnceWith('parent.dusk')
  expect(reads?.hydratedSubnames).toHaveLength(60)
  expect(reads?.readErrors).toEqual([])
})

it('hydrates all namespace descendants including nested and expired names', async () => {
  const namespace = {subnames:[{node:'child',name:'docs.alice.dusk',status:'active'},{node:'leaf',name:'api.docs.alice.dusk',status:'expired'}],ancestors:[]}
  const client = {getNameState:async()=>({namespace}),resolveForward:async()=>({records:[]}),getActivityPage:async()=>({activity:[]}),getAllSubnames:async()=>[namespace.subnames[0]]}
  const reads = await readIndexedName(client as never, {canonical:'alice.dusk'} as never)
  expect(reads?.hydratedSubnames?.map(name=>[name.node,name.status])).toEqual([['child','active'],['leaf','expired']])
})


it.each([null, { records: [] }, { records: [{ key: 'moonlight_address', value: 'new-owner-address' }] }])(
  'hydrates the connected endpoint’s primary when the old name no longer resolves to it: %j', async forward => {
    const client = {
      resolveForward: async () => forward, getNameState: async () => null,
      getActivityPage: async () => ({ activity: [] }), getAllSubnames: async () => [],
      getPrimaryName: vi.fn(async () => 'alice.dusk'),
    }
    const reads = await readIndexedName(client as never, { canonical: 'alice.dusk' } as never, 'alice-address')
    expect(client.getPrimaryName).toHaveBeenCalledWith({ type: 'moonlight_address', value: 'alice-address' })
    expect(reads?.connectedPrimaryName).toBe('alice.dusk')
    const hydrate = vi.fn()
    const actions = searchActions({ domain: { hydrate } })
    applyIndexedNameHydration({ ...actions, currentBlockHeight: 100, nowSeconds: 0, recordSourceContractId: 'resolver' } as never, reads!)
    expect(hydrate).toHaveBeenCalledWith(expect.objectContaining({
      primaryEndpoint: 'alice-address', connectedPrimaryName: 'alice.dusk',
      primaryName: forward?.records.length ? 'alice.dusk' : null,
    }))
  },
)
