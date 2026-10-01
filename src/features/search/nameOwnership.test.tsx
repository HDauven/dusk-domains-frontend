import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { createManagedNameState, type ManagedNameState } from '../../app/managedNameState'
import { deriveAppDerivedState } from '../../app/derived/deriveAppDerivedState'
import { namehashHex } from '../../names/internal'
import { openIndexedName } from './actions/openIndexedName'
import { checkAvailability } from './actions/checkAvailability'
import { SearchResultPanel, type SearchResultPanelProps } from './SearchResultPanel'
import { useIndexedNameHydration } from './useIndexedNameHydration'
import type { UseSearchControllerProps } from './searchControllerTypes'

function page(managedName: ManagedNameState, viewerAuthority = 'viewer') {
  return renderToStaticMarkup(<SearchResultPanel {...{
    headerProps: { status: 'registered', displayName: 'other.dusk', owner: 'viewer', records: [], viewerAuthority },
    primaryProps: { primaryVerification: { verified: false }, displayName: 'other.dusk' },
    settingsProps: { managedName }, nodeHex: namehashHex('other.dusk'), resultView: 'details',
    detailsProps: {displayName:'other.dusk', parentResolverRecords:[], activityEntries:[], subnames:[], primaryVerification:{tone:'muted'}},
    subdomainsProps: {subnames:[]}, overviewProps: {canRegister:false},
  } as unknown as SearchResultPanelProps} />)
}

it.each(['owner', 'manager'])('hides controls for a %s from another node even before reset', role => {
  const managedName = { ...createManagedNameState('resolver'), node: namehashHex('mine.dusk'), [role]: 'viewer', expiresAt: 200 }
  const html = page(managedName)
  expect(html).not.toContain('>You</')
  expect(html).not.toContain('>Records</')
  expect(html).not.toContain('>Settings</')
  expect(html).not.toContain('Transfer name')
  const capabilities = deriveAppDerivedState({ managedName, nodeHex: namehashHex('other.dusk'),
    activeRecordTarget: { node: namehashHex('other.dusk'), name: 'other.dusk' },
    selectedAuthority: 'viewer', selectedAddress: 'wallet', walletSigningReady: true, currentBlockHeight: 100,
    confirmationInput: 'other.dusk', displayName: 'other.dusk', subnameLabel: 'pay',
    primaryEndpointValue: '', pendingReservations: [], subnames: [], recordDraftErrors: [], recordDraftMutations: [{}],
  } as never)
  for (const key of ['canManageName', 'canRenewName', 'canSaveRecords', 'canRemoveRecords', 'canCreateSubname', 'canSetPrimary', 'connectedAsNameOwner'] as const) {
    expect(capabilities[key], key).toBe(false)
  }
})

it.each(['open', 'search'])('clears ownership when %s succeeds but hydration health fails', async action => {
  let managedName = createManagedNameState('resolver')
  const setManagedName = (update: ManagedNameState | ((current: ManagedNameState) => ManagedNameState)) => {
    managedName = typeof update === 'function' ? update(managedName) : update
  }
  const client = {
    searchName: vi.fn(async (canonical: string) => ({ canonical, status: 'registered' })),
    getHealth: vi.fn().mockResolvedValue({ ok: true, currentBlockHeight: 100 }),
    getNameState: vi.fn(async () => ({ owner: 'viewer', manager: 'viewer', expiresAtBlockHeight: 200 })),
    resolveForward: vi.fn(async () => ({ records: [] })),
    getActivityPage: vi.fn(async () => ({ activity: [] })), getAllSubnames: vi.fn(async () => []),
  }
  const setters = Object.fromEntries(['setActivityEntries', 'setActivityCursor', 'setIndexerError', 'setPrimaryEndpointValue',
    'setPrimaryName', 'setResolverRecordSets', 'setSubnames', 'setCurrentBlockHeight'].map(key => [key, vi.fn()]))
  const props = new Proxy({ ...setters, setManagedName, indexerClient: client, recordSourceContractId: 'resolver',
    beginActivityRead: () => () => true, beginOwnershipRead: () => () => true, loadPendingReservations: () => [],
  }, { get: (target, key) => key in target ? target[key as keyof typeof target] : vi.fn() })
  let hydration!: ReturnType<typeof useIndexedNameHydration>
  function Probe() { hydration = useIndexedNameHydration(props as never); return null }
  renderToStaticMarkup(<Probe />)
  const actions = new Proxy({ ...hydration, query: 'other.dusk' }, {
    get: (target, key) => key in target ? target[key as keyof typeof target] : Reflect.get(props, key),
  }) as unknown as UseSearchControllerProps
  await openIndexedName(actions, 'mine.dusk')
  expect(managedName).toMatchObject({ node: namehashHex('mine.dusk'), owner: 'viewer', manager: 'viewer' })
  client.getHealth.mockRejectedValue(new Error('offline'))
  if (action === 'open') await openIndexedName(actions, 'other.dusk')
  else await checkAvailability(actions)
  expect(client.searchName).toHaveBeenLastCalledWith('other.dusk')
  expect(managedName.node).toBe('')
  expect(managedName.owner).not.toBe('viewer')
  expect(managedName.manager).not.toBe('viewer')
  expect(page(managedName)).not.toContain('>You</')
  expect(client.getNameState).toHaveBeenCalledOnce()
})

it('opens a preview name as an example result instead of a registered profile', async () => {
  const setResultView = vi.fn()
  const actions = new Proxy({ indexerClient:null,setResultView }, {get:(target,key)=>key in target ? target[key as keyof typeof target] : vi.fn()}) as unknown as Parameters<typeof openIndexedName>[0]
  await openIndexedName(actions,'preview.dusk')
  expect(setResultView).toHaveBeenLastCalledWith('overview')
})
