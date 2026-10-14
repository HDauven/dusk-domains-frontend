import { useEffect } from 'react'
import { useScopedState } from '../utils/useScopedState'
import type { DuskDomainsIndexerClient } from '../names/internal'
import { indexerReadable } from './indexerIdentity'
import { unpaused } from './operatorPause'
import { useIndexerHealth } from './useIndexerHealth'

export function useOperatorPause(client: DuskDomainsIndexerClient | null, scope: string) {
  const { health, updatedAt } = useIndexerHealth(client)
  const [pause, setPause] = useScopedState(scope, unpaused)
  // A stuck indexer's flags are its last publication's. Writes read the live flags before signing.
  useEffect(() => { if (health && indexerReadable(health) && health.pause) setPause(health.pause) }, [health, updatedAt, setPause])
  return pause
}
