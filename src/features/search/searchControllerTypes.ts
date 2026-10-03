import type { DuskDomainsIndexerClient, NameResult, PendingNameReservation } from '../../names/internal'
import type { CurrentBlockHeightReader } from '../../app/duskNodeHeight'
import type { useSearchAppState } from '../../app/useSearchAppState'
import type { useRegistrationAppState } from '../../app/useRegistrationAppState'
import type { useDomainManagementAppState } from '../../app/useDomainManagementAppState'
import type { useDomainRecordState } from '../domains/useDomainRecordState'
import type { useActivityFeed } from '../activity/useActivityFeed'

export type SearchStateActions = {
  search: ReturnType<typeof useSearchAppState>['searchActions']
  registration: ReturnType<typeof useRegistrationAppState>['searchActions']
  domain: ReturnType<typeof useDomainManagementAppState>['searchActions']
  records: ReturnType<typeof useDomainRecordState>['searchActions']
  activity: ReturnType<typeof useActivityFeed>['searchActions']
}

export type UseSearchControllerProps = SearchStateActions & {
  chainId: string
  getCurrentBlockHeight: CurrentBlockHeightReader
  searchNameFromIndexer?: (client: DuskDomainsIndexerClient, name: string) => Promise<NameResult>
  beginNameRead: () => () => boolean
  hydrateNameFromIndexer: (client: DuskDomainsIndexerClient, result: NameResult, isCurrent?: () => boolean) => Promise<void>
  indexerClient: DuskDomainsIndexerClient | null
  loadPendingReservations: () => PendingNameReservation[]
  openSearchView: () => void
  query: string
}
