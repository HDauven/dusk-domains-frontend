import type { ComponentProps } from 'react'
import {
  type DuskDomainsIndexerClient,
  type PendingNameReservation,
} from '../../names/internal'
import {
  formatPendingReservationDetail,
  pendingReservationActionCopy,
  pendingReservationNextStepCopy,
  pendingReservationStatusCopy,
} from '../registration/registrationCopy'
import { formatNameLifecycle } from './domainFormat'
import { MyDomainsView } from './MyDomainsView'
import { useMyDomains } from './useMyDomains'
import { useMyDomainsViewModel } from './useMyDomainsViewModel'

export function useMyDomainsFeature({
  currentBlockHeight,
  indexerClient,
  mainView,
  onBlockHeightChange,
  onForgetPendingReservation,
  onLoadPendingReservations,
  onOpenIndexedName,
  onOpenPendingReservation,
  onSearchHome,
  pendingReservations,
  selectedAddress,
  selectedAuthority,
}: {
  currentBlockHeight: number | null
  indexerClient: DuskDomainsIndexerClient | null
  mainView: string
  onBlockHeightChange: (height: number | null) => void
  onForgetPendingReservation: (reservation: PendingNameReservation) => void
  onLoadPendingReservations: () => unknown
  onOpenIndexedName: (name: string) => void
  onOpenPendingReservation: (reservation: PendingNameReservation) => void
  onSearchHome: () => void
  pendingReservations: PendingNameReservation[]
  selectedAddress: string
  selectedAuthority: string
}) {
  const {
    loadMyNames,
    myNamePrimarySummaries,
    myNames,
    myNamesError,
    myNamesLoading,
  } = useMyDomains({
    indexerClient,
    onBlockHeightChange,
    onLoadPendingReservations,
    selectedAddress,
    selectedAuthority,
    shouldLoad: mainView === 'my-names',
  })
  const pendingReservationCount = pendingReservations.length
  const {
    description,
    emptyCopy,
    emptyTitle,
    heading,
    pendingReservationLabel,
    verifiedPrimaryCount,
  } = useMyDomainsViewModel({
    myNamePrimarySummaries,
    myNames,
    pendingReservationCount,
    selectedAddress,
  })

  const myDomainsProps: ComponentProps<typeof MyDomainsView> = {
    currentBlockHeight,
    description,
    emptyCopy,
    emptyTitle,
    formatNameLifecycle,
    formatPendingReservationDetail,
    heading,
    loading: myNamesLoading,
    myNames,
    myNamesError,
    onForgetPendingReservation,
    onOpenIndexedName,
    onOpenPendingReservation,
    onRefresh: () => void loadMyNames(),
    onSearchHome,
    pendingReservationActionCopy,
    pendingReservationNextStepCopy,
    pendingReservationStatusCopy,
    pendingReservations,
    primarySummaries: myNamePrimarySummaries,
    verifiedPrimaryCount,
  }

  return {
    loadMyNames,
    myDomainsProps,
    myNamePrimarySummaries,
    myNames,
    pendingReservationCount,
    pendingReservationLabel,
  }
}
