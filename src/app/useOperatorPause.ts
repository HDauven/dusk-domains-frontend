import { useEffect } from 'react'
import type { DuskDomainsIndexerClient } from '../names/internal'
import { useScopedState } from '../utils/useScopedState'
import { unpaused } from './operatorPause'

export function useOperatorPause(client: DuskDomainsIndexerClient | null, scope: string) {
  const [pause, setPause] = useScopedState(scope, unpaused)
  useEffect(() => {
    if (!client) return
    let active = true
    let pending = false
    const refresh = async () => {
      if (pending) return
      pending = true
      try {
        const health = await client.getHealth()
        if (active && health.ok && health.pause) setPause(health.pause)
      } catch {
        // Keep the last observed pause while the indexer reconnects.
      } finally { pending = false }
    }
    void refresh()
    const timer = setInterval(() => void refresh(), 10_000)
    return () => { active = false; clearInterval(timer) }
  }, [client, setPause])
  return pause
}
