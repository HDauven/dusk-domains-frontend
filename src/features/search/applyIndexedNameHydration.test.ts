import { expect, it, vi } from 'vitest'
import { createManagedNameState, type ManagedNameState } from '../../app/appHelpers'
import { applyIndexedNameHydration } from './applyIndexedNameHydration'
import { readIndexedName, type IndexedNameReadBundle } from './indexedNameReads'

function hydrate(managedName: ManagedNameState, stateValue: object, subnameValue: object | null) {
  let managed = managedName
  const setters = Object.fromEntries(['setActivityEntries', 'setDraftManager', 'setDraftOwner', 'setIndexerError',
    'setPrimaryEndpointValue', 'setPrimaryName', 'setResolverRecordSets', 'setSubnameManager', 'setSubnames']
    .map((name) => [name, vi.fn()]))
  const setManagedName = (update: ManagedNameState | ((current: ManagedNameState) => ManagedNameState)) => {
    managed = typeof update === 'function' ? update(managed) : update
  }
  applyIndexedNameHydration({ ...setters, setManagedName, currentBlockHeight: 1_000, nowSeconds: 1_790_000_000,
    recordSourceContractId: 'resolver', selectedAuthority: 'owner' } as never, {
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
    getActivity: vi.fn(async () => []), getSubnames: vi.fn(async () => []),
    getSubname: vi.fn(async () => ({ expiryPolicy: 'inherits_parent' })),
  }
  const root = await readIndexedName(client as never, { canonical: 'alphavnuc.dusk' } as never)
  expect(client.getSubname).not.toHaveBeenCalled()
  expect(root?.ownSubnameRead).toEqual({ value: null, error: null })
  const subname = await readIndexedName(client as never, { canonical: 'pay.alphavnuc.dusk' } as never)
  expect(client.getSubname).toHaveBeenCalledExactlyOnceWith(subname?.node)
  expect(subname?.ownSubnameRead.value).toEqual({ expiryPolicy: 'inherits_parent' })
})
