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
    const setApiSearchResult = vi.fn()
    const hydrateNameFromIndexer = vi.fn(async () => {})
    const setIndexerError = vi.fn()
    const props = {
      beginNameRead: createNameReadGuard(),
      hydrateNameFromIndexer,
      indexerClient: { searchName: (query: keyof typeof searches) => searches[query].promise },
      setActivityLoading: vi.fn(), setApiSearchResult, setChecked: vi.fn(), setIndexerConfirmation: vi.fn(),
      setIndexerError, setRegistrationStep: vi.fn(), setResultView: vi.fn(),
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
    expect(setIndexerError).toHaveBeenCalledTimes(2)
  })

  it('leaves loading and errors to the newer read', async () => {
    const searches = { 'a.dusk': deferred<NameResult>(), 'b.dusk': deferred<NameResult>() }
    const setActivityLoading = vi.fn()
    const setIndexerError = vi.fn()
    const props = {
      beginNameRead: createNameReadGuard(),
      hydrateNameFromIndexer: vi.fn(async () => {}),
      indexerClient: { searchName: (query: keyof typeof searches) => searches[query].promise },
      setActivityLoading, setApiSearchResult: vi.fn(), setChecked: vi.fn(), setIndexerConfirmation: vi.fn(),
      setIndexerError, setRegistrationStep: vi.fn(), setResultView: vi.fn(),
    } as unknown as UseSearchControllerProps

    const searchA = checkAvailability({ ...props, query: 'a.dusk' })
    const searchB = checkAvailability({ ...props, query: 'b.dusk' })
    searches['a.dusk'].reject(new Error('Failed to fetch'))
    await searchA
    expect(setActivityLoading).toHaveBeenLastCalledWith(true)
    expect(setIndexerError.mock.calls.every(([message]) => message === '')).toBe(true)

    searches['b.dusk'].resolve(result('b.dusk'))
    await searchB
    expect(setActivityLoading).toHaveBeenLastCalledWith(false)
  })
})
