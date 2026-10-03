import type { SearchStateActions } from './searchControllerTypes'

export function resetSearchState({ search, registration, domain, records, activity }: SearchStateActions, nextValue: string) {
  domain.reset()
  search.reset(nextValue)
  registration.reset()
  activity.reset()
  records.reset()
}
