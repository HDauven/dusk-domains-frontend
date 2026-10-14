import { indexedSubnameToState, indexerRead, type IndexerReadResult } from '../../app/indexerReadHelpers'
import { trustedDuskAddressOf } from '../identity/addressTrust'
import type {
  ActivityEntry,
  DuskDomainsIndexerClient,
  DuskDomainsOnChainClient,
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
  /** Dusk addresses of the names above a subname, to show who holds them. Only candidates: each is checked against an authority. */
  ancestorAddresses: string[]
  activityRead: IndexerReadResult<ActivityEntry[]>
  connectedPrimaryName: string | null
  forwardRead: IndexerReadResult<ForwardResolutionResponse>
  hydratedSubnames: SubnameState[] | null
  node: string
  // This name's own subname entry, which holds its expiry policy; null for a root name.
  ownSubnameRead: IndexerReadResult<IndexedSubname | null>
  // Resolved name for the forward endpoint; never populated from read_primary.
  primaryName: string | null
  primaryEndpoint: string
  readErrors: string[]
  stateRead: IndexerReadResult<IndexedLifecycleName | null>
  subnameRead: IndexerReadResult<IndexedSubname[]>
}

// The indexer's resolver names each record it finds invalid as "<key>: <reason>". The finding stays
// with the record shown, also when the record shown was read from the chain.
function withResolverIssues(records: ResolverRecord[], errors: ForwardResolutionResponse['errors'] | undefined): ResolverRecord[] {
  const issues = (Array.isArray(errors) ? errors : []).filter(error => error?.code === 'invalid_record' && typeof error.message === 'string')
  if (!issues.length) return records
  return records.map(record => {
    const issue = issues.find(error => error.message.startsWith(`${record.key}: `))
    return issue ? { ...record, resolverIssue: issue.message } : record
  })
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
  if (onChainClient && searchResult.status === 'registered') {
    const [name, records] = await Promise.all([onChainClient.getName(canonicalName), onChainClient.getRecords(canonicalName)])
    if (!name.ok || !records.ok) throw new Error(!name.ok ? name.error.message : !records.ok ? records.error.message : 'Name data unavailable')
    if (!name.value.record) throw new Error('Name state changed. Search again.')
    const indexedWebsite = forwardRead.value?.records.find(record => record.key === 'website')?.value
    const chainWebsite = records.value.find(record => record.key === 'website')?.value
    if (stateRead.value?.owner !== name.value.record.owner || indexedWebsite !== chainWebsite) {
      if (stateRead.value) stateRead.value.verification = undefined
      if (forwardRead.value) forwardRead.value.verification = undefined
    }
    if (forwardRead.value) forwardRead.value.records = records.value.map(r => ({ key: r.key, value: r.value, visibility: r.visibility, ttlSeconds: r.ttlSeconds, updatedAt: '' }))
    if (stateRead.value) {
      stateRead.value.owner=name.value.record.owner
      stateRead.value.manager=name.value.record.manager
      stateRead.value.expiresAtBlockHeight=name.value.record.lifecycle.expiresAtBlock
      stateRead.value.graceEndsAtBlockHeight=name.value.record.lifecycle.graceEndsAtBlock
    }
  }
  if (forwardRead.value) forwardRead.value.records = withResolverIssues(forwardRead.value.records, forwardRead.value.errors)
  // The holders of the names above usually point those names at their own address. A failed read only leaves an ID unexplained.
  const ancestorAddressReads = Promise.all((stateRead.value?.namespace?.ancestors ?? []).map(ancestor =>
    client.getNodeRecord(ancestor.node, 'moonlight_address').then(record => trustedDuskAddressOf(record ? [record] : []) || null, () => null)))
  // Only an address "Send to" would offer is checked as this name's primary.
  const forwardAddress = trustedDuskAddressOf(forwardRead.value?.records ?? [])
  const forwardVerified = forwardRead.value?.verificationStatus === 'forward_resolved'
    && forwardRead.value.expiry?.status === 'active' && forwardRead.value.resolver?.health === 'ok'
  const primaryReadPromise = forwardAddress && forwardVerified ? indexerRead(onChainClient
    ? onChainClient.getPrimaryName({ type: 'moonlight_address', value: forwardAddress }).then(result => {
      if (!result.ok) throw new Error(result.error.message)
      return result.value
    })
    : client.getPrimaryName({ type: 'moonlight_address', value: forwardAddress })) : null
  const [primaryRead, connectedPrimaryRead] = await Promise.all([
    primaryReadPromise,
    selectedAddress === forwardAddress && primaryReadPromise ? primaryReadPromise
      : selectedAddress ? indexerRead(client.getPrimaryName({ type: 'moonlight_address', value: selectedAddress })) : null,
  ])
  // connectedPrimaryName is cleanup state, including a raw mapping that no longer
  // resolves. It must never be used for a display identity or a primary badge.
  const chainPrimaryRead = selectedAddress && !connectedPrimaryRead?.value && onChainClient
    ? await indexerRead(onChainClient.readPrimaryName({ type: 'moonlight_address', value: selectedAddress }))
    : null
  const chainPrimary = chainPrimaryRead?.value
  const hydratedSubnames = (stateRead.value?.namespace?.subnames ?? subnameRead.value)?.map(indexedSubnameToState) ?? null
  const ancestorAddresses = (await ancestorAddressReads).filter((address): address is string => Boolean(address))
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
    ancestorAddresses: [...new Set(ancestorAddresses)],
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
