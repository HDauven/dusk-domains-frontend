import type { DuskDomainsIndexerClient, DuskDomainsOnChainClient, ResolverRecord } from '../../names/internal'
import type { SearchStateActions } from './searchControllerTypes'

export type ResolverRecordSets = Record<string, ResolverRecord[]>

export type UseIndexedNameHydrationProps = Pick<SearchStateActions, 'search' | 'domain' | 'records' | 'activity'> & {
  currentBlockHeight: number | null
  displayName: string
  indexerClient: DuskDomainsIndexerClient | null
  onChainClient: DuskDomainsOnChainClient | null
  nowSeconds: number
  recordSourceContractId: string
  selectedAddress: string
}
