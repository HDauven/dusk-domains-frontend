import { indexedSubnameToState, indexerRead, type IndexerReadResult } from '../../app/indexerReadHelpers'
import type {
  ActivityEntry,
  DuskDomainsIndexerClient,
  DuskDomainsOnChainClient,
  ForwardResolutionResponse,
  IndexedLifecycleName,
  IndexedSubname,
  NameResult,
  SubnameState,
} from '../../names/internal'
import { isSubname, safeNamehashHex } from '../domains/domainFormat'

export type IndexedNameReadBundle = {
  activityCursor: string | null
  activityRead: IndexerReadResult<ActivityEntry[]>
  connectedPrimaryName: string | null
  forwardRead: IndexerReadResult<ForwardResolutionResponse>
  hydratedSubnames: SubnameState[] | null
  node: string
  // This name's own subname entry, which holds its expiry policy; null for a root name.
  ownSubnameRead: IndexerReadResult<IndexedSubname | null>
  primaryName: string | null
  primaryEndpoint: string
  readErrors: string[]
  stateRead: IndexerReadResult<IndexedLifecycleName | null>
  subnameRead: IndexerReadResult<IndexedSubname[]>
}

export async function readIndexedName(
  client: DuskDomainsIndexerClient,
  searchResult: NameResult,
  selectedAddress = '',
  onChainClient: DuskDomainsOnChainClient | null = null,
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
  const forwardAddress = forwardRead.value?.records.find(record => record.key === 'moonlight_address')?.value || ''
  const primaryReadPromise = forwardAddress ? indexerRead(client.getPrimaryName({ type: 'moonlight_address', value: forwardAddress })) : null
  const [primaryRead, connectedPrimaryRead] = await Promise.all([
    primaryReadPromise,
    selectedAddress === forwardAddress ? primaryReadPromise
      : selectedAddress ? indexerRead(client.getPrimaryName({ type: 'moonlight_address', value: selectedAddress })) : null,
  ])
  const chainPrimaryRead = selectedAddress && !connectedPrimaryRead?.value && onChainClient
    ? await indexerRead(onChainClient.readPrimaryName({ type: 'moonlight_address', value: selectedAddress }))
    : null
  const chainPrimary = chainPrimaryRead?.value
  const hydratedSubnames = (stateRead.value?.namespace?.subnames ?? subnameRead.value)?.map(indexedSubnameToState) ?? null
  const readErrors = [
    forwardRead.error,
    stateRead.error,
    activityRead.error,
    subnameRead.error,
    ownSubnameRead.error,
    primaryRead?.error,
    connectedPrimaryRead?.error,
    chainPrimaryRead?.error,
    chainPrimary && !chainPrimary.ok ? chainPrimary.error.message : null,
  ].filter((message): message is string => Boolean(message))

  return {
    activityCursor: activityRead.value?.nextCursor ?? null,
    activityRead: activityRead.error ? { value: null, error: activityRead.error } : { value: activityRead.value?.activity ?? [], error: null },
    connectedPrimaryName: connectedPrimaryRead?.value ?? (chainPrimary?.ok ? chainPrimary.value?.name : null) ?? null,
    forwardRead,
    hydratedSubnames,
    node,
    ownSubnameRead,
    primaryName: primaryRead?.value ?? null,
    primaryEndpoint: selectedAddress || forwardAddress,
    readErrors,
    stateRead,
    subnameRead,
  }
}
