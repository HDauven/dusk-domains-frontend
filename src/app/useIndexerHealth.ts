import { useSyncExternalStore } from 'react'
import type { DuskDomainsIndexerClient } from '../names/internal'
import { emptyHealthStore, sharedIndexerHealth } from './sharedIndexerHealth'

export function useIndexerHealth(client: DuskDomainsIndexerClient | null) {
  const store = client ? sharedIndexerHealth(client) : emptyHealthStore
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}
