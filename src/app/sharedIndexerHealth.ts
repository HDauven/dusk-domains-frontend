import { createSingleFlight } from './singleFlight'
import type { DuskDomainsIndexerClient } from '../names/internal'

export const HEALTH_INTERVAL_MS = 60_000
export type HealthSnapshot = { health: Awaited<ReturnType<DuskDomainsIndexerClient['getHealth']>> | null; error: boolean; updatedAt: number }
const empty: HealthSnapshot = { health: null, error: false, updatedAt: 0 }
const stores = new WeakMap<DuskDomainsIndexerClient, ReturnType<typeof createStore>>()

function createStore(client: DuskDomainsIndexerClient) {
  let snapshot = empty
  const flight = createSingleFlight<Awaited<ReturnType<DuskDomainsIndexerClient['getHealth']>>>()
  let pending: ReturnType<DuskDomainsIndexerClient['getHealth']> | null = null
  const listeners = new Set<() => void>()
  let stop: (() => void) | undefined
  const read = (fresh = false, afterWrite = false) => {
    if (pending && !afterWrite) return pending
    if (!fresh && snapshot.health?.ok && !snapshot.error && Date.now() - snapshot.updatedAt < HEALTH_INTERVAL_MS) return Promise.resolve(snapshot.health)
    const next = flight(() => client.getHealth(), client, afterWrite).then(health => {
      snapshot = { health, error: false, updatedAt: Date.now() }
      return health
    }, error => {
      snapshot = { ...snapshot, error: true }
      throw error
    }).finally(() => { if (pending === next) pending = null; listeners.forEach(listener => listener()) })
    pending = next
    return next
  }
  return {
    read,
    invalidate: () => { snapshot = { ...snapshot, error: true } },
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      if (listeners.size === 1) {
        const refresh = (event?: Event) => { if (document.visibilityState !== 'hidden') void read(true, event?.type === 'dusk-domains:write-confirmed').catch(() => {}) }
        const timer = window.setInterval(refresh, HEALTH_INTERVAL_MS)
        document.addEventListener('visibilitychange', refresh)
        window.addEventListener('dusk-domains:write-confirmed', refresh)
        let active = true
        queueMicrotask(() => { if (active && document.visibilityState !== 'hidden') void read().catch(() => {}) })
        stop = () => {
          active = false
          window.clearInterval(timer)
          document.removeEventListener('visibilitychange', refresh)
          window.removeEventListener('dusk-domains:write-confirmed', refresh)
        }
      }
      return () => { listeners.delete(listener); if (!listeners.size) stop?.() }
    },
  }
}

export function sharedIndexerHealth(client: DuskDomainsIndexerClient) {
  let store = stores.get(client)
  if (!store) { store = createStore(client); stores.set(client, store) }
  return store
}

export function readSharedHealth(client: DuskDomainsIndexerClient, fresh = false) {
  return sharedIndexerHealth(client).read(fresh, fresh)
}

export const emptyHealthStore = { subscribe: () => () => {}, getSnapshot: () => empty }
