import { createContext } from 'react'
import type { DuskDomainsIndexerClient } from '../names/internal'

export const NetworkFreshnessContext = createContext<string | null>(null)

export type IndexerHealth = Awaited<ReturnType<DuskDomainsIndexerClient['getHealth']>>

export function indexerFreshness(health: IndexerHealth | null, now: number) {
  if (!health) return 'Name data is unavailable. Reconnecting automatically.'
  // generatedAt is the last name event; an idle chain can still be fully synced.
  const timestamp = (value: unknown) => value && typeof value === 'object' && 'updatedAt' in value && typeof value.updatedAt === 'string' ? value.updatedAt : ''
  const syncedAt = Date.parse(timestamp(health.cursor) || timestamp(health.checkpoint))
  const age = Number.isFinite(syncedAt) ? Math.max(0, now - syncedAt) : null
  if (!health.ok || (health.lagBlocks ?? 0) > 12) return 'Name data is catching up. Recent changes may take longer to appear.'
  if (age !== null && age > 120_000) return `Name data is behind. Synced ${Math.floor(age / 60_000)} min ago.`
  return null
}
