import type { DuskDomainsIndexerClient } from '../names/internal'
import { indexerFreshness } from './networkFreshness'
import { useIndexerHealth } from './useIndexerHealth'

export function useIndexerFreshness(client: DuskDomainsIndexerClient | null, preview: boolean) {
  const { health, error, updatedAt } = useIndexerHealth(preview ? null : client)
  return error ? "Couldn't refresh. Retrying…" : health ? indexerFreshness(health, updatedAt) : null
}
