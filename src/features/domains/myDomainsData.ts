import {
  ALL_MARKETPLACES,
  contractPrincipalFromWalletAccount,
  namehashHex,
  type DuskDomainsIndexerClient,
  type IndexedMarketplaceAuction,
  type IndexedMarketplaceFixedSale,
  type IndexedNameSummary,
} from '../../names/internal'
import { sameAuthority } from '../identity/ownerLabel'
import { trustedDuskAddressOf } from '../identity/addressTrust'
import { isSubname } from './domainFormat'
import { forgetHeldSubnames, rememberedHeldSubnames } from './heldSubnames'

/** A name this wallet listed, held by the market until it sells or returns. */
export type HeldListing =
  | { kind: 'fixed'; name: string; node: string; listing: IndexedMarketplaceFixedSale }
  | { kind: 'auction'; name: string; node: string; listing: IndexedMarketplaceAuction }

/** A subname this wallet owns or manages under a name it does not hold. */
export type HeldSubname = {
  name: string
  node: string
  parentName: string
  role: 'owner' | 'manager'
  expiresAtBlockHeight: number | null
}

export type MyHoldings = {
  names: IndexedNameSummary[]
  listings: HeldListing[]
  subnames: HeldSubname[]
  /** Market listings could not be read, so listed names may be missing. */
  listingsUnavailable?: boolean
}

type HoldingsClient = Pick<DuskDomainsIndexerClient, 'getAllNames' | 'getAllHoldings' | 'getAllMarketplaceFixedSales' | 'getAllMarketplaceAuctions' | 'getPrimaryName' | 'getSubname'>

const rootOf = (name: string) => name.split('.').slice(-2).join('.')

/** The indexer lists every name, root or subname, by its owner and manager (/holdings). */
export function servesHolderIndex(health: { routes?: readonly string[] }) {
  return Boolean(health.routes?.includes('/holdings'))
}

// Everything the wallet controls: its root names, the names it has listed in the market,
// and subnames it holds under someone else's name. The holder index lists those subnames.
// Without it (an older indexer, or one that can't serve it now), subnames come from the owner
// filter, the wallet's primary name and subname pages opened in this browser, each read again
// before it shows.
export async function fetchMyHoldings({ indexerClient, selectedAddress, selectedAuthority, chainId, holderIndex = false }: {
  indexerClient: HoldingsClient
  selectedAddress: string
  selectedAuthority: string
  chainId: string
  /** The indexer serves the holder index. */
  holderIndex?: boolean
}): Promise<MyHoldings> {
  const authorities = ownerCandidatesFromWallet({ selectedAddress: selectedAddress.trim(), selectedAuthority })
  if (!selectedAddress.trim() || authorities.length === 0) return { names: [], listings: [], subnames: [] }
  const mine = (authority: string | null | undefined) => authorities.some(candidate => sameAuthority(candidate, authority))
  let listingsUnavailable = false
  const listingRead = <T,>(read: Promise<T[]>) => read.catch(() => { listingsUnavailable = true; return [] as T[] })
  const readPrimary = () => indexerClient.getPrimaryName({ type: 'moonlight_address', value: selectedAddress.trim() }).catch(() => null)
  const primaryRead = holderIndex ? null : readPrimary()
  const [held, fixedSales, auctions, indexed] = await Promise.all([
    fetchWalletScopedNames({ indexerClient, selectedAddress, selectedAuthority }),
    // Listings in every market: one the directory no longer prefers still holds the names listed there.
    listingRead(indexerClient.getAllMarketplaceFixedSales(undefined, { marketplace: ALL_MARKETPLACES })),
    listingRead(indexerClient.getAllMarketplaceAuctions(undefined, { marketplace: ALL_MARKETPLACES })),
    holderIndex ? Promise.all(authorities.map(authority => indexerClient.getAllHoldings({ authority }))).catch(() => null) : null,
  ])
  const names = held.filter(name => !isSubname(name.canonicalName))
  const listings: HeldListing[] = [
    ...fixedSales.filter(sale => mine(sale.sellerAuthority)).map(listing => ({ kind: 'fixed' as const, name: listing.name, node: listing.node, listing })),
    ...auctions.filter(auction => mine(auction.sellerAuthority)).map(listing => ({ kind: 'auction' as const, name: listing.name, node: listing.node, listing })),
  ]
  // Subnames under a root the wallet holds or listed are reached through that root.
  const roots = new Set([...names.map(name => name.canonicalName), ...listings.map(listing => listing.name)])
  const subnames = new Map<string, HeldSubname>()
  const add = (name: string, node: string, owner: string | null, manager: string | null, expiresAtBlockHeight: number | null | undefined) => {
    if (subnames.has(node) || roots.has(rootOf(name)) || !(mine(owner) || mine(manager))) return
    subnames.set(node, { name, node, parentName: name.slice(name.indexOf('.') + 1), role: mine(owner) ? 'owner' : 'manager', expiresAtBlockHeight: expiresAtBlockHeight ?? null })
  }
  if (indexed) {
    for (const row of indexed.flat()) if (row.kind === 'subname') add(row.name, row.node, row.owner, row.manager, row.expiresAtBlockHeight)
    return { names, listings, subnames: [...subnames.values()], ...(listingsUnavailable ? { listingsUnavailable } : {}) }
  }
  for (const name of held) if (isSubname(name.canonicalName)) add(name.canonicalName, name.node, name.owner ?? null, name.manager ?? null, name.expiresAtBlockHeight)
  const primary = await (primaryRead ?? readPrimary())
  const remembered = authorities.flatMap(authority => rememberedHeldSubnames(chainId, authority))
  const candidates = [...remembered, ...(primary && isSubname(primary) ? [{ node: safeNode(primary), name: primary }] : [])]
    .filter(candidate => candidate.node && !subnames.has(candidate.node))
  const reads = await Promise.all([...new Map(candidates.map(candidate => [candidate.node, candidate])).values()]
    .map(async candidate => ({ candidate, subname: await indexerClient.getSubname(candidate.node).catch(() => undefined) })))
  const released: string[] = []
  for (const { candidate, subname } of reads) {
    if (subname === undefined) continue
    if (!subname || !(mine(subname.owner) || mine(subname.manager))) { released.push(candidate.node); continue }
    add(subname.name, subname.node, subname.owner, subname.manager, subname.expiresAtBlockHeight)
  }
  for (const authority of authorities) forgetHeldSubnames(chainId, authority, released)
  return { names, listings, subnames: [...subnames.values()], ...(listingsUnavailable ? { listingsUnavailable } : {}) }
}

function safeNode(name: string) {
  try { return namehashHex(name) } catch { return '' }
}

export async function fetchWalletScopedNames({
  indexerClient,
  selectedAddress,
  selectedAuthority,
}: {
  indexerClient: Pick<DuskDomainsIndexerClient, 'getAllNames'>
  selectedAddress: string
  selectedAuthority: string
}): Promise<IndexedNameSummary[]> {
  const walletAddress = selectedAddress.trim()
  const authorityCandidates = ownerCandidatesFromWallet({
    selectedAddress: walletAddress,
    selectedAuthority,
  })

  if (!walletAddress || authorityCandidates.length === 0) return []

  const matchesWallet = (name: IndexedNameSummary) => Boolean(
    name.owner && authorityCandidates.includes(name.owner)
    || name.manager && authorityCandidates.includes(name.manager)
    || trustedDuskAddressOf(name.records) === walletAddress
  )
  const ownerResults = await Promise.all(authorityCandidates.map(async (owner) => (
    indexerClient.getAllNames({ owner })
  )))
  // Owner queries may include historical controllers; verify current membership too.
  const ownedNames = dedupeNames(ownerResults.flat()).filter(matchesWallet)
  return ownedNames
}

export function ownerCandidatesFromWallet({
  selectedAddress,
  selectedAuthority,
}: {
  selectedAddress: string
  selectedAuthority: string
}) {
  const candidates = [
    normalizeOwner(selectedAuthority),
  ]

  const derivedAuthority = selectedAddress ? contractPrincipalFromWalletAccount(selectedAddress) : null
  if (derivedAuthority?.ok) candidates.push(derivedAuthority.principal)

  return [...new Set(candidates.filter((candidate): candidate is string => Boolean(candidate)))]
}

function normalizeOwner(value: string) {
  const normalized = value.trim()
  return /^0x[a-fA-F0-9]{64}$/.test(normalized) ? normalized.toLowerCase() : normalized
}

function dedupeNames(names: IndexedNameSummary[]) {
  const byNode = new Map<string, IndexedNameSummary>()
  for (const name of names) byNode.set(name.node, name)
  return [...byNode.values()]
}
