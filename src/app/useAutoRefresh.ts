import type { RefreshOptions } from './singleFlight'
import { useEffect, useRef } from 'react'

// Loaders own request ordering across navigation, writes and background refresh.
export function useAutoRefresh(refresh: (options?: RefreshOptions) => unknown, enabled = true, intervalMs = 30_000) {
  const current = useRef(refresh)
  useEffect(() => { current.current = refresh })
  useEffect(() => {
    if (!enabled) return
    let disposed = false
    const run = async (event?: Event) => {
      if (disposed || document.visibilityState === 'hidden') return
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
