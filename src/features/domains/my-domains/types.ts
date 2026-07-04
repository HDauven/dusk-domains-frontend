import type { IndexedNameSummary, PendingNameReservation } from '../../../names/internal'

export type MyNamePrimarySummary = {
  label: string
  tone: 'success' | 'warning' | 'muted'
}

export type CommitWindowStatus = 'missing' | 'waiting' | 'ready' | 'stale'

export type MyDomainsViewProps = {
  currentBlockHeight: number | null
  description: string
  emptyCopy: string
  emptyTitle: string
  formatNameLifecycle: (name: IndexedNameSummary) => string
  formatPendingReservationDetail: (reservation: PendingNameReservation) => string
  heading: string
  loading: boolean
  myNames: IndexedNameSummary[]
  myNamesError: string
  onForgetPendingReservation: (reservation: PendingNameReservation) => void
  onOpenIndexedName: (name: string) => void
  onOpenPendingReservation: (reservation: PendingNameReservation) => void
  onRefresh: () => void
  onSearchHome: () => void
  pendingReservationActionCopy: (status: CommitWindowStatus) => string
  pendingReservationNextStepCopy: (status: CommitWindowStatus, waitBlocks: number) => string
  pendingReservationStatusCopy: (status: CommitWindowStatus, waitBlocks: number) => string
  pendingReservations: PendingNameReservation[]
  primarySummaries: Record<string, MyNamePrimarySummary>
  verifiedPrimaryCount: number
}

export type MyDomainsHeaderProps = Pick<
  MyDomainsViewProps,
  | 'description'
  | 'heading'
  | 'loading'
  | 'myNames'
  | 'onRefresh'
  | 'pendingReservations'
  | 'verifiedPrimaryCount'
>

export type PendingReservationsListProps = Pick<
  MyDomainsViewProps,
  | 'currentBlockHeight'
  | 'formatPendingReservationDetail'
  | 'onForgetPendingReservation'
  | 'onOpenPendingReservation'
  | 'pendingReservationActionCopy'
  | 'pendingReservationNextStepCopy'
  | 'pendingReservationStatusCopy'
  | 'pendingReservations'
>

export type MyDomainRowsProps = Pick<
  MyDomainsViewProps,
  | 'formatNameLifecycle'
  | 'myNames'
  | 'onOpenIndexedName'
  | 'primarySummaries'
>

export type MyDomainsEmptyStateProps = Pick<
  MyDomainsViewProps,
  | 'emptyCopy'
  | 'emptyTitle'
  | 'onSearchHome'
>
