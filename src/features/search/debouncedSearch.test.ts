import { afterEach, expect, it, vi } from 'vitest'
import { scheduleSearch, suggestedNames } from './debouncedSearch'

afterEach(() => vi.useRealTimers())
it('waits for a typing pause, cancels superseded input and ignores empty input', () => {
  vi.useFakeTimers()
  const search = vi.fn()
  const cancel = scheduleSearch('alpha', search)
  vi.advanceTimersByTime(300)
  expect(search).not.toHaveBeenCalled()
  cancel()
  scheduleSearch('beta', search)
  vi.advanceTimersByTime(350)
  expect(search.mock.calls).toEqual([['beta']])
  scheduleSearch(' ', search)
  vi.runAllTimers()
  expect(search).toHaveBeenCalledTimes(1)
})
it('offers other root names without preserving a taken suffix', () => {
  expect(suggestedNames('alpha.dusk')).toEqual(['alphahq.dusk', 'myalpha.dusk', 'alpha1.dusk'])
})
