import type { Dispatch, SetStateAction } from 'react'
import type {
  ActivityEntry,
  DuskNamesIndexerClient,
  NameResult,
  ResolverRecord,
  SubnameState,
} from '../../names/internal'
import type { ManagedNameState } from '../../app/appHelpers'

export type ResolverRecordSets = Record<string, ResolverRecord[]>

export type UseIndexedNameHydrationProps = {
  currentBlockHeight: number | null
  displayName: string
  indexerClient: DuskNamesIndexerClient | null
  nowSeconds: number
  recordSourceContractId: string
  selectedAuthority: string
  setActivityEntries: Dispatch<SetStateAction<ActivityEntry[]>>
  setActivityLoading: Dispatch<SetStateAction<boolean>>
  setApiSearchResult: Dispatch<SetStateAction<NameResult | null>>
  setDelegateManager: Dispatch<SetStateAction<string>>
  setDraftManager: Dispatch<SetStateAction<string>>
  setDraftOwner: Dispatch<SetStateAction<string>>
  setDraftResolver: Dispatch<SetStateAction<string>>
  setIndexerConfirmation: Dispatch<SetStateAction<string>>
  setIndexerError: Dispatch<SetStateAction<string>>
  setManagedName: Dispatch<SetStateAction<ManagedNameState>>
  setPrimaryEndpointValue: Dispatch<SetStateAction<string>>
  setPrimaryName: Dispatch<SetStateAction<string | null>>
  setResolverRecordSets: Dispatch<SetStateAction<ResolverRecordSets>>
  setSubnameManager: Dispatch<SetStateAction<string>>
  setSubnames: Dispatch<SetStateAction<SubnameState[]>>
}
