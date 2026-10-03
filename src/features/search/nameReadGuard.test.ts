import { searchActions } from './test-fixtures/searchActions'
import { describe, expect, it, vi } from 'vitest'
import type { NameResult } from '../../names/internal'
import { checkAvailability } from './actions/checkAvailability'
import { createNameReadGuard } from './nameReadGuard'
import type { UseSearchControllerProps } from './searchControllerTypes'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail })
  return { promise, resolve, reject }
}

const result = (canonical: string) => ({ canonical, status: 'available' }) as NameResult

describe('name read guard', () => {
  it('keeps only the newest read current', () => {
    const begin = createNameReadGuard()
    const first = begin()
    expect(first()).toBe(true)
    const second = begin()
    expect(first()).toBe(false)
    expect(second()).toBe(true)
  })

  it('drops a search that resolves after a newer one finished', async () => {
    const searches = { 'a.dusk': deferred<NameResult>(), 'b.dusk': deferred<NameResult>() }
    const actions = searchActions()
    const setApiSearchResult = actions.search.showResult
    const hydrateNameFromIndexer = vi.fn(async () => {})
    const setIndexerError = actions.search.fail
    const props = {
      ...actions,
      beginNameRead: createNameReadGuard(),
      hydrateNameFromIndexer,
      indexerClient: { searchName: (query: keyof typeof searches) => searches[query].promise },
    } as unknown as UseSearchControllerProps

    const searchA = checkAvailability({ ...props, query: 'a.dusk' })
    const searchB = checkAvailability({ ...props, query: 'b.dusk' })
    searches['b.dusk'].resolve(result('b.dusk'))
    await searchB
    searches['a.dusk'].resolve(result('a.dusk'))
    await searchA

    expect(setApiSearchResult).toHaveBeenLastCalledWith(result('b.dusk'))
    expect(setApiSearchResult).not.toHaveBeenCalledWith(result('a.dusk'))
    expect(hydrateNameFromIndexer).toHaveBeenCalledTimes(1)
    expect(hydrateNameFromIndexer).toHaveBeenCalledWith(props.indexerClient, result('b.dusk'), expect.any(Function))
    expect(actions.search.startRead).toHaveBeenCalledTimes(2)
    expect(setIndexerError).not.toHaveBeenCalled()
  })

  it('leaves loading and errors to the newer read', async () => {
    const searches = { 'a.dusk': deferred<NameResult>(), 'b.dusk': deferred<NameResult>() }
    const actions = searchActions()
    const setIndexerError = actions.search.fail
    const props = {
      ...actions,
      beginNameRead: createNameReadGuard(),
      hydrateNameFromIndexer: vi.fn(async () => {}),
      indexerClient: { searchName: (query: keyof typeof searches) => searches[query].promise },
    } as unknown as UseSearchControllerProps

    const searchA = checkAvailability({ ...props, query: 'a.dusk' })
    const searchB = checkAvailability({ ...props, query: 'b.dusk' })
    searches['a.dusk'].reject(new Error('Failed to fetch'))
    await searchA
    expect(actions.activity.startLoading).toHaveBeenCalledTimes(2)
    expect(actions.activity.finishLoading).not.toHaveBeenCalled()
    expect(setIndexerError).not.toHaveBeenCalled()

    searches['b.dusk'].resolve(result('b.dusk'))
    await searchB
    expect(actions.activity.finishLoading).toHaveBeenCalledOnce()
  })
})
