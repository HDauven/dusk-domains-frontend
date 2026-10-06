import { searchActions } from './test-fixtures/searchActions'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, expect, it, vi } from 'vitest'
import { useSearchController } from './useSearchController'
import type { UseSearchControllerProps } from './searchControllerTypes'
import { checkAvailability, openIndexedName } from './searchControllerActions'

vi.mock('./searchControllerActions', () => ({
  checkAvailability: vi.fn(), openIndexedName: vi.fn(),
  openPendingReservation: vi.fn(), forgetPendingReservation: vi.fn(),
}))
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks() })

function controller() {
  const props = new Proxy({ ...searchActions(), beginNameRead: vi.fn(), query: '' }, {
    get: (target, key) => key in target ? target[key as keyof typeof target] : vi.fn(),
  }) as unknown as UseSearchControllerProps
  let result!: ReturnType<typeof useSearchController>
  function Probe() { result = useSearchController(props); return null }
  renderToStaticMarkup(<Probe />)
  return { ...result, beginNameRead: props.beginNameRead }
}

it('checks availability on submit only; typing just invalidates older reads', () => {
  vi.useFakeTimers()
  const search = controller()
  search.resetSearch('alpha')
  search.resetSearch('beta')
  vi.runAllTimers()
  expect(search.beginNameRead).toHaveBeenCalledTimes(2)
  expect(checkAvailability).not.toHaveBeenCalled()
  void search.handleCheckAvailability()
  expect(checkAvailability).toHaveBeenCalledTimes(1)
})

it('cancels a typed search when opening a profile or clearing the field', () => {
  vi.useFakeTimers()
  const search = controller()
  search.resetSearch('alpha')
  search.openIndexedName('beta.dusk')
  vi.runAllTimers()
  expect(openIndexedName).toHaveBeenCalledWith(expect.anything(), 'beta.dusk')
  expect(checkAvailability).not.toHaveBeenCalled()
  search.resetSearch('alpha')
  search.resetSearch('')
  vi.runAllTimers()
  expect(checkAvailability).not.toHaveBeenCalled()
})
