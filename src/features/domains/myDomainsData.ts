import {
  contractPrincipalFromWalletAccount,
  type DuskDomainsIndexerClient,
  type IndexedNameSummary,
} from '../../names/internal'

export async function fetchWalletScopedNames({
  indexerClient,
  selectedAddress,
  selectedAuthority,
}: {
  indexerClient: Pick<DuskDomainsIndexerClient, 'getNames'>
  selectedAddress: string
  selectedAuthority: string
}): Promise<IndexedNameSummary[]> {
  const walletAddress = selectedAddress.trim()
  const authorityCandidates = ownerCandidatesFromWallet({
    selectedAddress: walletAddress,
    selectedAuthority,
  })

  if (!walletAddress || authorityCandidates.length === 0) return []

  const ownerResults = await Promise.all(authorityCandidates.map(async (owner) => (
    indexerClient.getNames({ owner })
  )))
  const ownedNames = dedupeNames(ownerResults.flat())
  if (ownedNames.length > 0) return ownedNames

  const allNames = await indexerClient.getNames()
  return dedupeNames(allNames.filter((name) => (
    name.owner && authorityCandidates.includes(name.owner)
    || name.manager && authorityCandidates.includes(name.manager)
    || name.records.some((record) => (
      record.key === 'moonlight_address' && record.value === walletAddress
    ))
  )))
}

function ownerCandidatesFromWallet({
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
