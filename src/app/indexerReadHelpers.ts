import { unixSecondsFromIso } from '../features/domains/domainFormat'
import {
  type DuskNamesIndexerClient,
  type IndexedSubname,
  type SubnameState,
  userFacingErrorMessage,
} from '../names/internal'

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
    revocationPolicy: subname.revocationPolicy,
    createdAt: unixSecondsFromIso(subname.createdAt) ?? 0,
    status: subname.status,
    revokedAt: unixSecondsFromIso(subname.revokedAt),
  }
}

export function currentBlockHeightFromHealth(health: Awaited<ReturnType<DuskNamesIndexerClient['getHealth']>>) {
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
