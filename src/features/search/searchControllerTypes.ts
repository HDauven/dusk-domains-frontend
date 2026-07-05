import type { Dispatch, SetStateAction } from 'react'
import type {
  ActivityEntry,
  DuskDomainsIndexerClient,
  DuskDomainTxState,
  NameResult,
  ResolverRecord,
  SubnameExpiryPolicy,
  SubnameRevocationPolicy,
  SubnameState,
} from '../../names/internal'
import type { RegistrationCompletionState } from '../registration/registrationCompletionState'
import type { RegistrationStepId } from '../registration/registrationSteps'
import type { PreparedRegistrationCommit } from '../registration/usePendingReservations'
import type { SearchResultView } from './SearchWorkspace'

export type ResolverRecordSets = Record<string, ResolverRecord[]>

export type UseSearchControllerProps = {
  hydrateNameFromIndexer: (client: DuskDomainsIndexerClient, result: NameResult) => Promise<void>
  indexerClient: DuskDomainsIndexerClient | null
  loadPendingReservations: () => void
  openSearchView: () => void
  query: string
  recordSourceContractId: string
  selectedAuthority: string
  setActivityEntries: Dispatch<SetStateAction<ActivityEntry[]>>
  setActivityLoading: Dispatch<SetStateAction<boolean>>
  setApiSearchResult: Dispatch<SetStateAction<NameResult | null>>
  setChecked: Dispatch<SetStateAction<boolean>>
  setCommitTxState: Dispatch<SetStateAction<DuskDomainTxState | null>>
  setCommitted: Dispatch<SetStateAction<boolean>>
  setConfirmationInput: Dispatch<SetStateAction<string>>
  setCriticalRecordConfirmation: Dispatch<SetStateAction<string>>
  setCurrentBlockHeight: Dispatch<SetStateAction<number | null>>
  setDelegateManager: Dispatch<SetStateAction<string>>
  setDelegateSubnameNode: Dispatch<SetStateAction<string>>
  setDuration: Dispatch<SetStateAction<number>>
  setIndexerConfirmation: Dispatch<SetStateAction<string>>
  setIndexerError: Dispatch<SetStateAction<string>>
  setManagementError: Dispatch<SetStateAction<string>>
  setManagementTxState: Dispatch<SetStateAction<DuskDomainTxState | null>>
  setPreparedCommit: Dispatch<SetStateAction<PreparedRegistrationCommit | null>>
  setPrimaryEndpointValue: Dispatch<SetStateAction<string>>
  setPrimaryError: Dispatch<SetStateAction<string>>
  setPrimaryName: Dispatch<SetStateAction<string | null>>
  setPrimaryTxState: Dispatch<SetStateAction<DuskDomainTxState | null>>
  setPublicRecordAcknowledged: Dispatch<SetStateAction<boolean>>
  setQuery: Dispatch<SetStateAction<string>>
  setRecordDrafts: Dispatch<SetStateAction<Record<string, string>>>
  setRecordError: Dispatch<SetStateAction<string>>
  setRecordTargetNode: Dispatch<SetStateAction<string>>
  setRecordTxState: Dispatch<SetStateAction<DuskDomainTxState | null>>
  setRegisterSetsPrimary: Dispatch<SetStateAction<boolean>>
  setRegistrationAddressInput: Dispatch<SetStateAction<string>>
  setRegistrationCompletion: Dispatch<SetStateAction<RegistrationCompletionState | null>>
  setRegistrationStep: Dispatch<SetStateAction<RegistrationStepId>>
  setRenewalError: Dispatch<SetStateAction<string>>
  setRenewalTxState: Dispatch<SetStateAction<DuskDomainTxState | null>>
  setRenewalYears: Dispatch<SetStateAction<number>>
  setResolverRecordSets: Dispatch<SetStateAction<ResolverRecordSets>>
  setResultView: Dispatch<SetStateAction<SearchResultView>>
  setSubnameError: Dispatch<SetStateAction<string>>
  setSubnameExpiryDate: Dispatch<SetStateAction<string>>
  setSubnameExpiryPolicy: Dispatch<SetStateAction<SubnameExpiryPolicy>>
  setSubnameLabel: Dispatch<SetStateAction<string>>
  setSubnameManager: Dispatch<SetStateAction<string>>
  setSubnameResolver: Dispatch<SetStateAction<string>>
  setSubnameRevocationPolicy: Dispatch<SetStateAction<SubnameRevocationPolicy>>
  setSubnameTxState: Dispatch<SetStateAction<DuskDomainTxState | null>>
  setSubnames: Dispatch<SetStateAction<SubnameState[]>>
  setTxState: Dispatch<SetStateAction<DuskDomainTxState | null>>
}
