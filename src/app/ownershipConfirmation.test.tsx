import { searchActions } from '../features/search/test-fixtures/searchActions'
import { createWriteAccess } from './writeAccess'
import { unpaused } from './operatorPause'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, expect, it, vi } from 'vitest'
import { namehashHex, submitDuskDomainWrite, type DuskDomainCallMetadata } from '../names/internal'
import { SearchResultPanel, type SearchResultPanelProps } from '../features/search/SearchResultPanel'
import { useIndexedNameHydration } from '../features/search/useIndexedNameHydration'
import { useMarketplaceWrites } from '../features/marketplace/useMarketplaceWrites'
import { deriveAppDerivedState } from './derived/deriveAppDerivedState'
import { createManagedNameState, type ManagedNameState } from './managedNameState'
import { createOwnershipConfirmation, type PendingOwnership } from './ownershipConfirmation'
import { OwnershipConfirmationNotice } from './OwnershipConfirmationNotice'
import { useDuskDomainWriter } from './useDuskDomainWriter'

const wallet = { state: { installed: true, authorized: true, chainId: 'dusk:0', profiles: [{ account: 'owner', profileId: 'primary' }], selectedProfile: { account: 'owner', profileId: 'primary' } } as import('@dusk/connect').DuskWalletState }

vi.mock('../names/internal', async importOriginal => ({
  ...await importOriginal<typeof import('../names/internal')>(), submitDuskDomainWrite: vi.fn(),
}))
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks() })
const node = namehashHex('alpha.dusk')
const original = { ...createManagedNameState('resolver'), node, owner:'viewer', manager:'viewer', expiresAt:200 }

function harness(nextOwner = 'recipient') {
  let managedName = original
  let pending: PendingOwnership[] = []
  const setManagedName = (update: ManagedNameState | ((current: ManagedNameState) => ManagedNameState)) => {
    managedName = typeof update === 'function' ? update(managedName) : update
  }
  const state = { node, owner:nextOwner, manager:'recipient', expiresAtBlockHeight:200 }
  const indexerClient = {
    getHealth:vi.fn().mockResolvedValue({ok:true,finalizedBlockHeight:100}),
    getNameState:vi.fn().mockRejectedValue(new Error('offline')),
  }
  const onChainClient = {
    getCurrentBlockHeight:vi.fn().mockResolvedValue({ok:true,value:100}),
    getNameByNode:vi.fn().mockResolvedValue({ok:true,value:{node,record:{...state,lifecycle:{expiresAtBlock:200,graceEndsAtBlock:300}}}}),
  }
  const ownership = createOwnershipConfirmation({indexerClient:indexerClient as never,onChainClient:onChainClient as never,
    setManagedName,setPending:changes=>{pending=changes}})
  let submit!: ReturnType<typeof useDuskDomainWriter>
  function Probe() {
    submit = useDuskDomainWriter({ wallet, chainId: 'dusk:0',contracts:{} as never,writeAccess:createWriteAccess({mode:'live_ready',liveWritesEnabled:true}, {} as never, unpaused),liveDuskDomainsApp:{} as never,confirmOwnershipWrite:ownership.afterWrite})
    return null
  }
  renderToStaticMarkup(<Probe />)
  vi.mocked(submitDuskDomainWrite).mockResolvedValue({status:'executed'} as never)
  return {ownership,indexerClient,onChainClient,state,submit,get managedName(){return managedName},get pending(){return pending}}
}

function expectControls(managedName: ManagedNameState, allowed: boolean) {
  const capabilities = deriveAppDerivedState({managedName,nodeHex:node,activeRecordTarget:{node,name:'alpha.dusk'},
    selectedAuthority:'viewer',selectedAddress:'wallet',walletSigningReady:true,currentBlockHeight:100,
    confirmationInput:'alpha.dusk',displayName:'alpha.dusk',subnameLabel:'pay',primaryEndpointValue:'',
    pendingReservations:[],subnames:[],recordDraftErrors:[],recordDraftMutations:[{}],
  } as never)
  for (const key of ['canManageName','canSaveRecords','canRemoveRecords','canCreateSubname','connectedAsNameOwner'] as const) {
    expect(capabilities[key],key).toBe(allowed)
  }
  const html = renderToStaticMarkup(<SearchResultPanel {...{
    headerProps:{status:'registered',displayName:'alpha.dusk',owner:'viewer',records:[],viewerAuthority:'viewer'},
    nodeHex:node,
    resultView:'details',
    detailsProps:{
      displayName:'alpha.dusk',
      parentResolverRecords:[],
      subnames:[],
      primaryVerification:{tone:'muted'},
      activity: { activityEntries:[] },
    },
    overviewProps:{
      canRegister:false,
      quote: {  },
      reservation: {  },
    },
    management: { settingsProps:{
        managedName,
        ownership: {  },
        renewal: {  },
        clock: {  },
      }, primaryProps:{primaryVerification:{verified:false},displayName:'alpha.dusk'}, subdomainsProps:{
        subnames:[],
        creation: {  },
        authority: {  },
        clock: {  },
      } },
  } as unknown as SearchResultPanelProps} />)
  for (const text of ['>You</','>Records</','>Settings</']) expect(html.includes(text),text).toBe(allowed)
}

it.each([
  ['store','update_authorities','transfer'],
  ['store','update_authorities','manager'],
  ['store','escrow_fixed_sale','sale'],
  ['store','escrow_auction','auction'],
  ['store','accept_marketplace_offer','offer'],
  ['marketplace','buy_fixed_sale','purchase'],
  ['marketplace','cancel_fixed_sale','cancel sale'],
  ['marketplace','expire_fixed_sale','expire sale'],
  ['marketplace','cancel_auction','cancel auction'],
  ['marketplace','expire_auction','expire auction'],
  ['marketplace','settle_auction','settlement'],
])('invalidates immediately after %s.%s (%s), fails closed for 15 reads, and retries without signing', async (contract,functionName,kind) => {
  vi.useFakeTimers()
  const h = harness(kind === 'manager' ? 'viewer' : 'recipient')
  expectControls(h.managedName,true)
  const call = {contract,functionName,args:{node,owner:h.state.owner,manager:h.state.manager}} as DuskDomainCallMetadata
  const write = h.submit('alpha.dusk',call,{ownershipChange:kind === 'manager' ? 'manager' : 'transfer'})
  await vi.advanceTimersByTimeAsync(0)
  expectControls(h.managedName,false)
  expect(h.pending).toMatchObject([{node,checking:true,message:kind === 'manager' ? 'Manager change sent. Confirming…' : 'Transfer sent. Confirming…'}])
  h.ownership.setManagedName(original)
  expectControls(h.managedName,false)
  await vi.runAllTimersAsync()
  expect(await write).toMatchObject({status:'executed',ownershipConfirmed:false})
  expect(h.indexerClient.getNameState).toHaveBeenCalledTimes(15)
  expectControls(h.managedName,false)
  const html = renderToStaticMarkup(<OwnershipConfirmationNotice pending={h.pending} onRetry={()=>{}} />)
  expect(html).toContain('sent. Confirming…')
  expect(html).toMatch(/<button(?![^>]*disabled)[^>]*>Retry confirmation<\/button>/)
  h.indexerClient.getNameState.mockResolvedValue(h.state)
  expect(await h.ownership.retry(node)).toBe(true)
  expect(h.pending).toEqual([])
  expect(h.managedName).toMatchObject({owner:h.state.owner,manager:h.state.manager})
  expectControls(h.managedName,kind === 'manager')
  expect(submitDuskDomainWrite).toHaveBeenCalledOnce()
})

it.each(['lagging','unhealthy','old authorities','wrong node','chain unavailable'])('refuses ownership confirmation with %s', async outcome => {
  vi.useFakeTimers()
  const h = harness()
  h.indexerClient.getNameState.mockResolvedValue(outcome === 'old authorities' ? original : outcome === 'wrong node' ? {...h.state,node:'other'} : h.state)
  if (outcome === 'lagging') h.indexerClient.getHealth.mockResolvedValue({ok:true,finalizedBlockHeight:99})
  if (outcome === 'unhealthy') h.indexerClient.getHealth.mockResolvedValue({ok:false,finalizedBlockHeight:100})
  if (outcome === 'chain unavailable') h.onChainClient.getCurrentBlockHeight.mockRejectedValue(new Error('offline'))
  const write = h.submit('alpha.dusk',{contract:'store',functionName:'update_authorities',args:{node}} as never)
  await vi.runAllTimersAsync()
  expect(await write).toMatchObject({ownershipConfirmed:false})
  expectControls(h.managedName,false)
  expect(h.pending[0].checking).toBe(false)
})

it('does not invalidate for a rejected transaction or a record write', async () => {
  const h = harness()
  vi.mocked(submitDuskDomainWrite).mockResolvedValueOnce({status:'rejected'} as never)
  await h.submit('alpha.dusk',{contract:'store',functionName:'update_authorities',args:{node}} as never)
  await h.submit('alpha.dusk',{contract:'store',functionName:'mutate_records_sender',args:{node}} as never)
  expectControls(h.managedName,true)
  expect(h.pending).toEqual([])
  expect(h.indexerClient.getNameState).not.toHaveBeenCalled()
})

it('ignores hydration started before a transfer even if it arrives after confirmation', async () => {
  const h = harness()
  let finishRead!: (value: typeof original) => void
  const oldRead = new Promise<typeof original>(resolve => {finishRead=resolve})
  const staleClient = {getHealth:async()=>({ok:true}),getNameState:()=>oldRead,
    resolveForward:async()=>({records:[]}),getActivityPage:async()=>({activity:[]}),getAllSubnames:async()=>[]}
  let hydration!: ReturnType<typeof useIndexedNameHydration>
  const props = { ...searchActions({ domain: {
    beginRead: h.ownership.beginRead,
    hydrate: snapshot => h.ownership.setManagedName(snapshot.managedName),
  } }), selectedAddress: '' }
  function Probe(){hydration=useIndexedNameHydration(props as never);return null}
  renderToStaticMarkup(<Probe />)
  const read = hydration.hydrateNameFromIndexer(staleClient as never,{canonical:'alpha.dusk'} as never)
  await Promise.resolve()
  h.indexerClient.getNameState.mockResolvedValue(h.state)
  await h.submit('alpha.dusk',{contract:'store',functionName:'update_authorities',args:{node}} as never)
  expect(h.managedName.owner).toBe('recipient')
  finishRead(original)
  await read
  expect(h.managedName.owner).toBe('recipient')
  expectControls(h.managedName,false)
})

it('keeps invalidation per node when navigating away and back, without replacing another name on retry', async () => {
  vi.useFakeTimers()
  const h = harness()
  const write = h.submit('alpha.dusk',{contract:'store',functionName:'escrow_fixed_sale',args:{node}} as never)
  await vi.runAllTimersAsync()
  await write
  const other = {...original,node:'other',owner:'other owner'}
  h.ownership.setManagedName(other)
  expect(h.managedName).toEqual(other)
  h.ownership.setManagedName(original)
  expectControls(h.managedName,false)
  h.ownership.setManagedName(other)
  h.indexerClient.getNameState.mockResolvedValue(h.state)
  await h.ownership.retry(node)
  expect(h.managedName).toEqual(other)
})

it('does not let an older retry confirm a subsequent ownership transaction', async () => {
  vi.useFakeTimers()
  const h = harness()
  const call = {contract:'store',functionName:'update_authorities',args:{node}} as DuskDomainCallMetadata
  const first = h.ownership.afterWrite('alpha.dusk',call)
  await vi.runAllTimersAsync()
  expect(await first).toBe(false)
  let finishOldRead!: (state: typeof h.state) => void
  const oldRead = new Promise<typeof h.state>(resolve=>{finishOldRead=resolve})
  h.indexerClient.getNameState.mockReturnValueOnce(oldRead)
  const retry = h.ownership.retry(node)
  await vi.advanceTimersByTimeAsync(0)
  const newer = h.ownership.afterWrite('alpha.dusk',call)
  await vi.advanceTimersByTimeAsync(0)
  finishOldRead(h.state)
  expect(await retry).toBe(false)
  expect(h.pending[0].checking).toBe(true)
  expectControls(h.managedName,false)
  await vi.runAllTimersAsync()
  expect(await newer).toBe(false)
  expectControls(h.managedName,false)
})

it('keeps marketplace confirmation in the shared retry notice until ownership is verified', async () => {
  vi.useFakeTimers()
  const h = harness()
  const setConfirmation = vi.fn(), loadMarketplace = vi.fn()
  let writes!: ReturnType<typeof useMarketplaceWrites>
  function Probe() {
    writes = useMarketplaceWrites({actionsAvailable:true,selectedAddress:'wallet',runtimeConfig:{contracts:{}},
      ensurePublicBalanceForLiveWrite:async()=>true,submitNameWrite:h.submit,indexerClient:h.indexerClient,duskDomainsOnChainClient:h.onChainClient,
      feedback:{setConfirmation,setError:vi.fn(),setTxState:vi.fn()},loadMarketplace,
    } as never)
    return null
  }
  renderToStaticMarkup(<Probe />)
  const write = writes.submit('listing','alpha.dusk',{contract:'store',functionName:'escrow_fixed_sale',args:{node}} as never)
  await vi.runAllTimersAsync()
  await write
  expect(setConfirmation).toHaveBeenCalledExactlyOnceWith('')
  expect(loadMarketplace).not.toHaveBeenCalled()
  expect(h.pending[0].message).toBe('Transfer sent. Confirming…')
  h.indexerClient.getNameState.mockResolvedValue(h.state)
  await h.ownership.retry(node)
  expect(h.pending).toEqual([])
  expect(submitDuskDomainWrite).toHaveBeenCalledOnce()
})

it('restores fresh ownership and lifecycle after a pending name is reopened with failed hydration', async () => {
  vi.useFakeTimers()
  const h = harness('viewer')
  const write = h.submit('alpha.dusk',{contract:'store',functionName:'update_authorities',args:{node}} as never,{ownershipChange:'manager'})
  await vi.runAllTimersAsync()
  await write
  h.ownership.setManagedName(createManagedNameState('resolver'))
  let hydration!: ReturnType<typeof useIndexedNameHydration>
  function Probe() {
    hydration = useIndexedNameHydration({ ...searchActions({ domain: {
      beginRead: h.ownership.beginRead,
      hydrate: snapshot => h.ownership.setManagedName(snapshot.managedName),
    } }), recordSourceContractId: 'resolver' } as never)
    return null
  }
  renderToStaticMarkup(<Probe />)
  await expect(hydration.hydrateNameFromIndexer({...h.indexerClient,resolveForward:async()=>({records:[]}),
    getActivityPage:async()=>({activity:[]}),getAllSubnames:async()=>[]} as never,{canonical:'alpha.dusk'} as never)).rejects.toThrow()
  expectControls(h.managedName,false)
  h.indexerClient.getNameState.mockResolvedValue({ ...h.state, graceEndsAtBlockHeight: 300 })
  expect(await h.ownership.retry(node)).toBe(true)
  await hydration.hydrateNameFromIndexer({...h.indexerClient,resolveForward:async()=>({records:[]}),
    getActivityPage:async()=>({activity:[]}),getAllSubnames:async()=>[]} as never,{canonical:'alpha.dusk'} as never)
  expect(h.managedName).toMatchObject({node,owner:'viewer',manager:'recipient',expiresAt:200,graceEndsAt:300})
  expectControls(h.managedName,true)
})
