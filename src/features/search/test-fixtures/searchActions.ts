import { vi } from 'vitest'
import type { SearchStateActions } from '../searchControllerTypes'

export function searchActions(overrides: { [K in keyof SearchStateActions]?: Partial<SearchStateActions[K]> } = {}) {
  return {
    search: {
      reset: vi.fn(), open: vi.fn(), showResult: vi.fn(), showView: vi.fn(),
      startRead: vi.fn(), fail: vi.fn(), confirm: vi.fn(), updateClock: vi.fn(),
      ...overrides.search,
    },
    registration: {
      reset: vi.fn(), review: vi.fn(), resume: vi.fn(), clearCompleted: vi.fn(), updateCommit: vi.fn(),
      ...overrides.registration,
    },
    domain: {
      reset: vi.fn(), clearName: vi.fn(), hydrate: vi.fn(), beginRead: () => () => true,
      ...overrides.domain,
    },
    records: { reset: vi.fn(), hydrate: vi.fn(), ...overrides.records },
    activity: {
      reset: vi.fn(), startLoading: vi.fn(), finishLoading: vi.fn(), hydrate: vi.fn(), beginRead: () => () => true,
      ...overrides.activity,
    },
  } satisfies SearchStateActions
}
