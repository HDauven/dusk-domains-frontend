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

it('checks the latest typed name after a pause and invalidates older reads immediately', () => {
  vi.useFakeTimers()
  const search = controller()
  search.resetSearch('alpha')
  vi.advanceTimersByTime(300)
  search.resetSearch('beta')
  expect(search.beginNameRead).toHaveBeenCalledTimes(2)
  expect(checkAvailability).not.toHaveBeenCalled()
  vi.advanceTimersByTime(350)
  expect(checkAvailability).toHaveBeenCalledTimes(1)
  expect(checkAvailability).toHaveBeenCalledWith(expect.objectContaining({ query: 'beta' }))
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
