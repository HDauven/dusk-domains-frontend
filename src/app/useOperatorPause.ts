import { useEffect } from 'react'
import { useScopedState } from '../utils/useScopedState'
import type { DuskDomainsIndexerClient } from '../names/internal'
import { unpaused } from './operatorPause'
import { useIndexerHealth } from './useIndexerHealth'

export function useOperatorPause(client: DuskDomainsIndexerClient | null, scope: string) {
  const { health, updatedAt } = useIndexerHealth(client)
  const [pause, setPause] = useScopedState(scope, unpaused)
  useEffect(() => { if (health?.ok && health.pause) setPause(health.pause) }, [health, updatedAt, setPause])
  return pause
}
