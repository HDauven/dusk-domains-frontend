import type { DuskDomainsIndexerClient, IndexedNameSummary } from '../../names/internal'
import { sameAuthority } from '../identity/ownerLabel'
import { trustedDuskAddressOf } from '../identity/addressTrust'
import { lifecycleHeightReached, unixSecondsFromIso } from './domainFormat'
import type { MyNamePrimarySummary } from './MyDomainsView'

// Records can survive transfer and custody. A matching address alone does not
// make a name primary, even when a cached list summary still says "verified".
export function indexedPrimaryIsActive(name: IndexedNameSummary, currentBlockHeight: number | null) {
  // Only an address "Send to" would offer can be a name's primary address here.
  const address = trustedDuskAddressOf(name.records)
  return name.status === 'active' && Boolean(address)
    && [name.owner, name.manager].some(authority => sameAuthority(authority, address))
    && !lifecycleHeightReached(name.expiresAtBlockHeight ?? unixSecondsFromIso(name.expiresAt) ?? 0,
      currentBlockHeight, Math.floor(Date.now() / 1000))
}

export async function readIndexedPrimarySummary(client: Pick<DuskDomainsIndexerClient, 'getPrimaryName'>, name: IndexedNameSummary): Promise<MyNamePrimarySummary> {
  const address = trustedDuskAddressOf(name.records)
  if (!address) return name.records.some(record => record.key === 'moonlight_address')
    ? { label: 'Invalid address', tone: 'warning' } : { label: 'No address', tone: 'muted' }
  if (!indexedPrimaryIsActive(name, null)) return { label: 'Not primary', tone: 'warning' }
  try {
    // /reverse uses the SDK projection's authority and incarnation checks.
    const primary = await client.getPrimaryName({ type: 'moonlight_address', value: address })
    if (primary === name.canonicalName) return { label: 'Verified', tone: 'success' }
    return { label: primary ? 'Not primary' : 'No primary', tone: 'warning' }
  } catch {
    return { label: 'Primary unknown', tone: 'warning' }
  }
}

export async function readIndexedPrimarySummaries(client: DuskDomainsIndexerClient, names: IndexedNameSummary[]) {
  // Many names can point to one address. Share a resolution only within this
  // refresh so a later listing, transfer or cancellation cannot reuse it.
  const reads = new Map<string, Promise<string | null>>()
  const reader: Pick<DuskDomainsIndexerClient, 'getPrimaryName'> = {
    getPrimaryName: endpoint => {
      const key = `${endpoint.type}:${endpoint.value}`
      const read = reads.get(key) ?? client.getPrimaryName(endpoint)
      reads.set(key, read)
      return read
    },
  }
  return Object.fromEntries(await Promise.all(names.map(async name =>
    [name.node, await readIndexedPrimarySummary(reader, name)] as const)))
}
