import { useSingleFlight } from './useSingleFlight'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DuskDomainsIndexerClient } from '../names/internal'
import { createNameReadGuard } from '../features/search/nameReadGuard'
import { indexerFreshness, type IndexerHealth } from './networkFreshness'
import { useAutoRefresh } from './useAutoRefresh'

export function useIndexerFreshness(client: DuskDomainsIndexerClient | null, preview: boolean) {
  const [state, setState] = useState<{ health: IndexerHealth | null; now: number } | null>(null)
  const beginRead = useMemo(() => createNameReadGuard(), [])
  const readData = useCallback(async () => {
    const isCurrent = beginRead()
    try {
      const health = await (client?.getHealth() ?? Promise.resolve(null))
      if (isCurrent()) setState({ health, now: Date.now() })
    } catch {
      if (isCurrent()) setState({ health: null, now: Date.now() })
    }
  }, [beginRead, client])
  const refresh = useSingleFlight(readData, readData)

  useAutoRefresh(refresh, !preview)
  useEffect(() => {
    let disposed = false
    globalThis.queueMicrotask(() => { if (!disposed && !preview) void refresh() })
    return () => { disposed = true; beginRead() }
  }, [beginRead, preview, refresh])
  return state ? indexerFreshness(state.health, state.now) : null
}
