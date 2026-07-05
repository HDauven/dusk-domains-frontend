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
import { safeNamehashHex } from '../domains/domainFormat'

export type IndexedNameReadBundle = {
  activityRead: IndexerReadResult<ActivityEntry[]>
  forwardRead: IndexerReadResult<ForwardResolutionResponse>
  hydratedSubnames: SubnameState[] | null
  node: string
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

  const [forwardRead, stateRead, activityRead, subnameRead] = await Promise.all([
    indexerRead(client.resolveForward(canonicalName)),
    indexerRead(client.getNameState(node)),
    indexerRead(client.getActivity(node)),
    indexerRead(client.getSubnames(node)),
  ])
  const primaryName = await readPrimaryNameForForwardRecord(client, forwardRead.value?.records)
  const hydratedSubnames = subnameRead.value?.map(indexedSubnameToState) ?? null
  const subnameRecordSets = hydratedSubnames
    ? await readSubnameRecordSets(client, hydratedSubnames)
    : {}
  const readErrors = [
    forwardRead.error,
    stateRead.error,
    activityRead.error,
    subnameRead.error,
  ].filter((message): message is string => Boolean(message))

  return {
    activityRead,
    forwardRead,
    hydratedSubnames,
    node,
    primaryName,
    readErrors,
    stateRead,
    subnameRead,
    subnameRecordSets,
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
  const subnameRecordReads = await Promise.all(hydratedSubnames.map((subname) => (
    indexerRead(client.resolveForward(subname.name))
  )))

  return Object.fromEntries(subnameRecordReads.flatMap((read, index) => (
    read.value ? [[hydratedSubnames[index].node, read.value.records]] : []
  )))
}
