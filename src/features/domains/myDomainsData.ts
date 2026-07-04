import type { DuskNamesIndexerClient, IndexedNameSummary } from '../../names/internal'

export async function fetchWalletScopedNames({
  indexerClient,
  selectedAddress,
  selectedAuthority,
}: {
  indexerClient: Pick<DuskNamesIndexerClient, 'getNames'>
  selectedAddress: string
  selectedAuthority: string
}): Promise<IndexedNameSummary[]> {
  if (!selectedAddress.trim() || !selectedAuthority.trim()) return []
  return indexerClient.getNames({ owner: selectedAuthority })
}
