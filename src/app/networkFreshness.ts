import { createContext } from 'react'
import type { DuskDomainsIndexerClient } from '../names/internal'
import { isDeploymentMismatch, staleIndexerData, UNVERIFIED_INDEXER } from './indexerIdentity'

export const NetworkFreshnessContext = createContext<string | null>(null)

export type IndexerHealth = Awaited<ReturnType<DuskDomainsIndexerClient['getHealth']>>

// The indexer's collector stops at an event it can't read, and keeps the last data it published.
function collectorStopped(health: IndexerHealth) {
  const status = health.cursor?.status
  return status === 'blocked' || status === 'stopped'
}

export function indexerFreshness(health: IndexerHealth | null, now: number) {
  if (!health) return 'Name data is unavailable. Reconnecting automatically.'
  if (isDeploymentMismatch(health)) return UNVERIFIED_INDEXER
  // Data that stopped updating is never presented as live.
  const stale = staleIndexerData(health)
  if (stale?.code === 'collector_blocked') return `Name data stopped updating at block ${stale.blockHeight}. Recent changes may not appear until it resumes.`
  if (collectorStopped(health)) return 'Name data stopped updating. Recent changes may not appear until it resumes.'
  // generatedAt is the last name event; an idle chain can still be fully synced.
  const timestamp = (value: unknown) => value && typeof value === 'object' && 'updatedAt' in value && typeof value.updatedAt === 'string' ? value.updatedAt : ''
  const syncedAt = Date.parse(timestamp(health.cursor) || timestamp(health.checkpoint))
  const age = Number.isFinite(syncedAt) ? Math.max(0, now - syncedAt) : null
  if (!health.ok || (health.lagBlocks ?? 0) > 12) return 'Name data is catching up. Recent changes may take longer to appear.'
  if (age !== null && age > 120_000) return `Name data is behind. Synced ${Math.floor(age / 60_000)} min ago.`
  return null
}
