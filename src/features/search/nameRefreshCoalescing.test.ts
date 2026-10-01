import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { checkAvailability } from './actions/checkAvailability'
import { createNameReadGuard } from './nameReadGuard'
import { useIndexedNameHydration } from './useIndexedNameHydration'
import type { NameResult } from '../../names/internal'

it('shares name reads between navigation and automatic refresh', async () => {
  const result = { canonical: 'alpha.dusk', status: 'available' } as NameResult
  const search = Promise.withResolvers<NameResult>()
  const health = Promise.withResolvers<{ ok: boolean }>()
  const client = { searchName: vi.fn(() => search.promise), getHealth: vi.fn(() => health.promise),
    resolveForward: vi.fn(async () => ({records:[]})), getNameState: vi.fn(async () => null),
    getActivityPage: vi.fn(async () => ({activity:[]})), getAllSubnames: vi.fn(async () => []) }
  let loader!: ReturnType<typeof useIndexedNameHydration>
  function Probe() {
    loader = useIndexedNameHydration({ indexerClient:client,displayName:'alpha.dusk',beginActivityRead:()=>()=>true,
      beginOwnershipRead:()=>()=>true,setActivityLoading:vi.fn(),setApiSearchResult:vi.fn(),setIndexerError:vi.fn(),
      setIndexerConfirmation:vi.fn(),setCurrentBlockHeight:vi.fn(),setManagedName:vi.fn(),setSubnames:vi.fn(),
      setResolverRecordSets:vi.fn(),setPrimaryName:vi.fn(),setPrimaryEndpointValue:vi.fn(),setSubnameManager:vi.fn(),
      setActivityEntries:vi.fn(),setActivityCursor:vi.fn(),
    } as never)
    return null
  }
  renderToStaticMarkup(createElement(Probe))
  const navigation = loader.searchNameFromIndexer(client as never, 'alpha.dusk')
  const background = loader.refreshCurrentNameFromIndexer()
  await vi.waitFor(() => expect(client.searchName).toHaveBeenCalledOnce())
  search.resolve(result)
  await navigation
  const hydration = loader.hydrateNameFromIndexer(client as never, result)
  await vi.waitFor(() => expect(client.getHealth).toHaveBeenCalledOnce())
  health.resolve({ok:true})
  await Promise.all([background, hydration])
  expect(client.searchName).toHaveBeenCalledOnce()
  expect(client.getHealth).toHaveBeenCalledOnce()
  expect(client.resolveForward).toHaveBeenCalledOnce()
})

it('displays alpha after alpha → beta → alpha even when beta resolves first', async () => {
  const alpha = Promise.withResolvers<NameResult>(), beta = Promise.withResolvers<NameResult>()
  const client = { searchName: vi.fn((name: string) => name === 'alpha.dusk' ? alpha.promise : beta.promise) }
  let loader!: ReturnType<typeof useIndexedNameHydration>
  function Probe() { loader = useIndexedNameHydration({} as never); return null }
  renderToStaticMarkup(createElement(Probe))
  const setApiSearchResult = vi.fn()
  const props = new Proxy({ indexerClient: client, beginNameRead: createNameReadGuard(),
    searchNameFromIndexer: loader.searchNameFromIndexer, setApiSearchResult }, {
    get: (target, key) => key in target ? target[key as keyof typeof target] : vi.fn(),
  })
  const search = (query: string) => checkAvailability(new Proxy(props, {
    get: (target, key) => key === 'query' ? query : Reflect.get(target, key),
  }) as never)
  const requests = [search('alpha.dusk'), search('beta.dusk'), search('alpha.dusk')]
  beta.resolve({ canonical: 'beta.dusk', status: 'available' } as NameResult)
  alpha.resolve({ canonical: 'alpha.dusk', status: 'available' } as NameResult)
  await Promise.all(requests)
  expect(setApiSearchResult.mock.calls.filter(([result]) => result !== null)).toEqual([[{ canonical: 'alpha.dusk', status: 'available' }]])
  expect(client.searchName).toHaveBeenCalledTimes(2)
})
