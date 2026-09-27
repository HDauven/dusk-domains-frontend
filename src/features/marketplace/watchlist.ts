import { useCallback, useState } from 'react'

const MARKETPLACE_WATCHLIST_KEY = 'dusk-domains-marketplace-watchlist-v1'

// Watched listings live on this device only.
export function useWatchlist() {
  const [watchedNodes, setWatchedNodes] = useState<string[]>(readWatchlist)

  const update = useCallback((change: (current: string[]) => string[]) => {
    setWatchedNodes((current) => {
      const next = change(current)
      if (next !== current) writeWatchlist(next)
      return next
    })
  }, [])

  const toggleWatch = useCallback((node: string) => update((current) => (
    current.includes(node) ? current.filter((watched) => watched !== node) : [...current, node]
  )), [update])

  const watch = useCallback((node: string) => update((current) => (
    current.includes(node) ? current : [...current, node]
  )), [update])

  return { toggleWatch, watch, watchedNodes }
}

function readWatchlist() {
  try {
    const value = globalThis.localStorage?.getItem(MARKETPLACE_WATCHLIST_KEY)
    const parsed: unknown = value ? JSON.parse(value) : []
    return Array.isArray(parsed) ? parsed.filter((node): node is string => typeof node === 'string') : []
  } catch {
    return []
  }
}

function writeWatchlist(nodes: string[]) {
  try {
    globalThis.localStorage?.setItem(MARKETPLACE_WATCHLIST_KEY, JSON.stringify(nodes))
  } catch {
    // Watching remains available for this session when browser storage is unavailable.
  }
}
