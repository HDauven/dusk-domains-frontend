import {
  indexedSubnameToState,
  indexerRead,
  type IndexerReadResult,
} from '../../app/appHelpers'
import type {
  ActivityEntry,
  DuskDomainsIndexerClient,
  ForwardResolutionResponse,
  IndexedLifecycleName,
  IndexedSubname,
  NameResult,
  ResolverRecord,
  SubnameState,
} from '../../names/internal'
import { isSubname, safeNamehashHex } from '../domains/domainFormat'

export type IndexedNameReadBundle = {
  activityCursor: string | null
  activityRead: IndexerReadResult<ActivityEntry[]>
  forwardRead: IndexerReadResult<ForwardResolutionResponse>
  hydratedSubnames: SubnameState[] | null
  node: string
  // This name's own subname entry, which holds its expiry policy; null for a root name.
  ownSubnameRead: IndexerReadResult<IndexedSubname | null>
  primaryName: string | null
  readErrors: string[]
  stateRead: IndexerReadResult<IndexedLifecycleName | null>
  subnameRead: IndexerReadResult<IndexedSubname[]>
  subnameRecordSets: Record<string, ResolverRecord[]>
}

export async function readIndexedName(
  client: DuskDomainsIndexerClient,
  searchResult: NameResult,
): Promise<IndexedNameReadBundle | null> {
  const canonicalName = searchResult.canonical
  const node = safeNamehashHex(canonicalName)
  if (!node) return null

  const rootName: IndexerReadResult<IndexedSubname | null> = { value: null, error: null }
  const [forwardRead, stateRead, activityRead, subnameRead, ownSubnameRead] = await Promise.all([
    indexerRead(client.resolveForward(canonicalName)),
    indexerRead(client.getNameState(node)),
    indexerRead(client.getActivityPage(node)),
    indexerRead(client.getAllSubnames(node)),
    isSubname(canonicalName) ? indexerRead(client.getSubname(node)) : rootName,
  ])
  const primaryName = await readPrimaryNameForForwardRecord(client, forwardRead.value?.records)
  const hydratedSubnames = subnameRead.value?.map(indexedSubnameToState) ?? null
  const subnameRecords = hydratedSubnames
    ? await readSubnameRecordSets(client, hydratedSubnames)
    : { records: {}, errors: [] }
  const readErrors = [
    forwardRead.error,
    stateRead.error,
    activityRead.error,
    subnameRead.error,
    ownSubnameRead.error,
    ...subnameRecords.errors,
  ].filter((message): message is string => Boolean(message))

  return {
    activityCursor: activityRead.value?.nextCursor ?? null,
    activityRead: activityRead.error ? { value: null, error: activityRead.error } : { value: activityRead.value?.activity ?? [], error: null },
    forwardRead,
    hydratedSubnames,
    node,
    ownSubnameRead,
    primaryName,
    readErrors,
    stateRead,
    subnameRead,
    subnameRecordSets: subnameRecords.records,
  }
}

async function readPrimaryNameForForwardRecord(
  client: DuskDomainsIndexerClient,
  records: ResolverRecord[] | undefined,
) {
  const moonlight = records?.find((record) => record.key === 'moonlight_address')
  if (!moonlight) return null

  const primaryRead = await indexerRead(client.getPrimaryName({
    type: 'moonlight_address',
    value: moonlight.value,
  }))
  return primaryRead.value
}

async function readSubnameRecordSets(
  client: DuskDomainsIndexerClient,
  hydratedSubnames: SubnameState[],
) {
  const records: Record<string, ResolverRecord[]> = {}
  const errors: string[] = []
  let next = 0
  await Promise.all(Array.from({ length: Math.min(4, hydratedSubnames.length) }, async () => {
    while (next < hydratedSubnames.length) {
      const subname = hydratedSubnames[next++]
      const read = await indexerRead(client.resolveForward(subname.name))
      if (read.value) records[subname.node] = read.value.records
      if (read.error) errors.push(read.error)
    }
  }))
  return { records, errors }
}
