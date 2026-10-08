import type { RefreshOptions } from './singleFlight'
import { useEffect, useRef } from 'react'

// Loaders own request ordering across navigation, writes and background refresh.
// A new scope (such as the wallet address once a session restores) makes reads that were in
// flight stale: they are dropped, so read again at once instead of waiting for the next tick.
export function useAutoRefresh(refresh: (options?: RefreshOptions) => unknown, enabled = true, intervalMs = 180_000, scope?: unknown) {
  const current = useRef(refresh)
  useEffect(() => { current.current = refresh })
  const seenScope = useRef(scope)
  useEffect(() => {
    if (Object.is(seenScope.current, scope)) return
    seenScope.current = scope
    if (!enabled || document.visibilityState === 'hidden') return
    Promise.resolve().then(() => current.current()).catch(() => { /* The reader owns its error state. */ })
  }, [enabled, scope])
  useEffect(() => {
    if (!enabled) return
    let disposed = false
    let lastResume = -Infinity
    const run = async (event?: Event) => {
      if (disposed || document.visibilityState === 'hidden') return
      if (event?.type === 'focus' && Date.now() - lastResume < 1_000) return
      if (event?.type === 'visibilitychange' || event?.type === 'focus') lastResume = Date.now()
      try { await current.current(event?.type === 'dusk-domains:write-confirmed' ? { fresh: true } : undefined) } catch { /* The reader owns its error state. */ }
    }
    const timer = window.setInterval(() => void run(), intervalMs)
    window.addEventListener('focus', run)
    window.addEventListener('dusk-domains:write-confirmed', run)
    document.addEventListener('visibilitychange', run)
    return () => {
      disposed = true
      window.clearInterval(timer)
      window.removeEventListener('focus', run)
      window.removeEventListener('dusk-domains:write-confirmed', run)
      document.removeEventListener('visibilitychange', run)
    }
  }, [enabled, intervalMs])
}
