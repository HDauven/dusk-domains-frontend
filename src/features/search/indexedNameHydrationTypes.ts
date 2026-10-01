import type { Dispatch, SetStateAction } from 'react'
import type {
  ActivityEntry,
  DuskDomainsIndexerClient,
  NameResult,
  ResolverRecord,
  SubnameState,
} from '../../names/internal'
import type { ManagedNameState } from '../../app/managedNameState'

export type ResolverRecordSets = Record<string, ResolverRecord[]>

export type UseIndexedNameHydrationProps = {
  beginOwnershipRead: (node: string) => () => boolean
  beginActivityRead: (node: string) => () => boolean
  currentBlockHeight: number | null
  displayName: string
  indexerClient: DuskDomainsIndexerClient | null
  nowSeconds: number
  recordSourceContractId: string
  selectedAuthority: string
  setActivityCursor: (page: { node: string; cursor: string | null } | null) => void
  setActivityEntries: Dispatch<SetStateAction<ActivityEntry[]>>
  setActivityLoading: Dispatch<SetStateAction<boolean>>
  setApiSearchResult: Dispatch<SetStateAction<NameResult | null>>
  setCurrentBlockHeight: Dispatch<SetStateAction<number | null>>
  setIndexerConfirmation: Dispatch<SetStateAction<string>>
  setIndexerError: Dispatch<SetStateAction<string>>
  setManagedName: Dispatch<SetStateAction<ManagedNameState>>
  setPrimaryEndpointValue: Dispatch<SetStateAction<string>>
  setPrimaryName: Dispatch<SetStateAction<string | null>>
  setResolverRecordSets: Dispatch<SetStateAction<ResolverRecordSets>>
  setSubnameManager: Dispatch<SetStateAction<string>>
  setSubnames: Dispatch<SetStateAction<SubnameState[]>>
}
