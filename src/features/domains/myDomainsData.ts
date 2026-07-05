import type { DuskDomainsIndexerClient, IndexedNameSummary } from '../../names/internal'

export async function fetchWalletScopedNames({
  indexerClient,
  selectedAddress,
  selectedAuthority,
}: {
  indexerClient: Pick<DuskDomainsIndexerClient, 'getNames'>
  selectedAddress: string
  selectedAuthority: string
}): Promise<IndexedNameSummary[]> {
  if (!selectedAddress.trim() || !selectedAuthority.trim()) return []
  return indexerClient.getNames({ owner: selectedAuthority })
}
