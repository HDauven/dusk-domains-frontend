import { searchActions } from './test-fixtures/searchActions'
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
    loader = useIndexedNameHydration({ ...searchActions(), indexerClient: client, displayName: 'alpha.dusk' } as never)
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
  function Probe() { loader = useIndexedNameHydration(searchActions() as never); return null }
  renderToStaticMarkup(createElement(Probe))
  const setApiSearchResult = vi.fn()
  const props = new Proxy({ ...searchActions({ search: { showResult: setApiSearchResult } }), indexerClient: client, beginNameRead: createNameReadGuard(),
    searchNameFromIndexer: loader.searchNameFromIndexer }, {
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

it('refreshes the timestamp with each height after an idle search without reservations', async () => {
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-03T12:00:00Z'))
  const { analyzeName, DEFAULT_FEE_CONFIG } = await import('../../names/internal')
  const { useNamePreview } = await import('./useNamePreview')
  const result = { ...analyzeName('aurora'), graceEndsAtBlockHeight: 10_000 }
  const boundary = 18_640
  let currentBlockHeight = boundary - 210, nowSeconds = Date.now() / 1000
  const actions = searchActions({ search: { updateClock: vi.fn((height, seconds) => {
    currentBlockHeight = height!
    nowSeconds = seconds!
  }) } })
  const client = { getHealth: vi.fn(async () => ({ ok: true, currentBlockHeight: boundary - 30 })),
    searchName: async () => result, resolveForward: async () => ({ records: [] }), getNameState: async () => null,
    getActivityPage: async () => ({ activity: [] }), getAllSubnames: async () => [] }
  let loader!: ReturnType<typeof useIndexedNameHydration>
  function Probe() {
    loader = useIndexedNameHydration({ ...actions, indexerClient: client, displayName: 'aurora.dusk', selectedAddress: '',
      onChainClient: null, currentBlockHeight, nowSeconds } as never)
    return null
  }
  let preview!: ReturnType<typeof useNamePreview>
  function Preview() {
    preview = useNamePreview({ apiSearchResult: result, currentBlockHeight, nowSeconds, duration: 1,
      feeConfig: DEFAULT_FEE_CONFIG, managedNameExpiresAt: 0, query: 'aurora', renewalYears: 1 })
    return null
  }
  try {
    renderToStaticMarkup(createElement(Probe))
    for (const timestamp of ['2026-10-03T12:30:00Z', '2026-10-03T13:00:00Z']) {
      clock.mockReturnValue(Date.parse(timestamp))
      const refreshed = await loader.refreshCurrentNameFromIndexer({ fresh: true })
      expect(actions.search.startRead).toHaveBeenCalled()
      expect(actions.search.fail).not.toHaveBeenCalled()
      expect(refreshed).toBe(true)
      expect(actions.search.updateClock).toHaveBeenLastCalledWith(boundary - 30, Date.parse(timestamp) / 1000)
      renderToStaticMarkup(createElement(Preview))
      expect(Date.parse(preview.result.premiumNextStepAt!)).toBe(Date.parse(timestamp) + 300_000)
    }
  } finally { clock.mockRestore() }
})
