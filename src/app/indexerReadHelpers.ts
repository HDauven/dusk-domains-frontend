import { readSharedHealth, sharedIndexerHealth } from './sharedIndexerHealth'
import { unixSecondsFromIso } from '../features/domains/domainFormat'
import {
  createDuskDomainsIndexerClient,
  type DuskDomainsIndexerClient,
  type IndexedSubname,
  type SubnameState,
  userFacingErrorMessage,
  waitForIndexerConfirmation,
} from '../names/internal'

export function createHealthyIndexerClient(baseUrl: string) {
  const healthUrl = `${baseUrl.trim().replace(/\/+$/u, '')}/health`
  let healthyUntil = 0
  let pendingHealth: ReturnType<DuskDomainsIndexerClient['getHealth']> | null = null
  const client = createDuskDomainsIndexerClient({
    baseUrl,
    fetch: async (input, init) => {
      // A reachable API can still be serving an incomplete or stale projection.
      if (String(input).split('?')[0] !== healthUrl && Date.now() >= healthyUntil) {
        try {
          if (!(await readSharedHealth(healthyClient)).ok) throw new Error('Domain data is still syncing. It will update automatically.')
        } catch (error) {
          // The health read already owns its retry; do not retry it again as a projection.
          throw new Error(error instanceof Error ? error.message : 'Name data is unavailable.', { cause: error })
        }
      }
      return fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(10_000) })
    },
  })
  const getHealth: DuskDomainsIndexerClient['getHealth'] = (params) => {
    // Explicit reads stay fresh for confirmation polling; concurrent checks share one request.
    if (params && Object.keys(params).length) {
      healthyUntil = 0
      sharedIndexerHealth(healthyClient).invalidate()
      return client.getHealth(params)
    }
    if (pendingHealth) return pendingHealth
    healthyUntil = 0
    pendingHealth = client.getHealth(params).then((health) => {
      if (health.ok) healthyUntil = Date.now() + 5_000
      return health
    }).finally(() => { pendingHealth = null })
    return pendingHealth
  }
  const healthyClient = { ...client, getHealth }
  return healthyClient
}

export async function waitForIndexerBlock(client: DuskDomainsIndexerClient | null, height: number | null) {
  if (!client || height === null) return false
  return (await waitForIndexerConfirmation({
    description: 'marketplace update', attempts: 15, delayMs: 1_000,
    check: async () => {
      const health = await client.getHealth()
      return health.ok && (health.finalizedBlockHeight ?? -1) >= height
    },
  })).confirmed
}

export type IndexerReadResult<T> =
  | {
      value: T
      error: null
    }
  | {
      value: null
      error: string
    }

export async function indexerRead<T>(promise: Promise<T>): Promise<IndexerReadResult<T>> {
  try {
    return {
      value: await promise,
      error: null,
    }
  } catch (error) {
    return {
      value: null,
      error: userFacingErrorMessage(error),
    }
  }
}

export function indexedSubnameToState(subname: IndexedSubname): SubnameState {
  return {
    parentName: subname.parentName,
    parentNode: subname.parentNode,
    label: subname.label,
    name: subname.name,
    node: subname.node,
    owner: subname.owner,
    manager: subname.manager,
    resolver: subname.resolver,
    expiresAt: subname.expiresAtBlockHeight ?? unixSecondsFromIso(subname.expiresAt) ?? 0,
    parentExpiresAt: subname.parentExpiresAtBlockHeight ?? unixSecondsFromIso(subname.parentExpiresAt) ?? 0,
    expiryPolicy: subname.expiryPolicy,
    createdAt: unixSecondsFromIso(subname.createdAt) ?? 0,
    status: subname.status,
  }
}

export function currentBlockHeightFromHealth(health: Awaited<ReturnType<DuskDomainsIndexerClient['getHealth']>>) {
  return maxNumericValue(
    health.currentBlockHeight,
    health.cursor?.currentBlockHeight,
    health.cursor?.lastBlockHeight,
    health.checkpoint?.lastBlockHeight,
  )
}

export function maxNumericValue(...values: Array<number | null | undefined>) {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0)
  return numeric.length ? Math.max(...numeric) : null
}
