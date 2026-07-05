import type { Dispatch, SetStateAction } from 'react'
import type { DuskDomainsIndexerClient, PendingNameReservation } from '../names/internal'
import type { AppMainView } from './AppTypes'
import { useAppNavigation } from './useAppNavigation'
import { useMyDomainsFeature } from '../features/domains/useMyDomainsFeature'

export type UseMainViewRuntimeArgs = {
  currentBlockHeight: number | null
  indexerClient: DuskDomainsIndexerClient | null
  loadPendingReservations: () => unknown
  loadReferralAccount: () => Promise<unknown>
  loadTreasuryView: () => Promise<boolean>
  mainView: AppMainView
  onForgetPendingReservation: (reservation: PendingNameReservation) => void
  onOpenIndexedName: (name: string) => void
  onOpenPendingReservation: (reservation: PendingNameReservation) => void
  onSearchHome: () => void
  pendingReservations: PendingNameReservation[]
  resetReferralCopied: () => void
  selectedAddress: string
  selectedAuthority: string
  setCurrentBlockHeight: Dispatch<SetStateAction<number | null>>
  setMainView: Dispatch<SetStateAction<AppMainView>>
}

export function useMainViewRuntime({
  currentBlockHeight,
  indexerClient,
  loadPendingReservations,
  loadReferralAccount,
  loadTreasuryView,
  mainView,
  onForgetPendingReservation,
  onOpenIndexedName,
  onOpenPendingReservation,
  onSearchHome,
  pendingReservations,
  resetReferralCopied,
  selectedAddress,
  selectedAuthority,
  setCurrentBlockHeight,
  setMainView,
}: UseMainViewRuntimeArgs) {
  const {
    loadMyNames,
    myDomainsProps,
    myNamePrimarySummaries,
    myNames,
    pendingReservationCount,
    pendingReservationLabel,
  } = useMyDomainsFeature({
    currentBlockHeight,
    indexerClient,
    mainView,
    onBlockHeightChange: setCurrentBlockHeight,
    onForgetPendingReservation,
    onLoadPendingReservations: loadPendingReservations,
    onOpenIndexedName,
    onOpenPendingReservation,
    onSearchHome,
    pendingReservations,
    selectedAddress,
    selectedAuthority,
  })

  const {
    handleMainViewChange,
  } = useAppNavigation({
    loadMyNames,
    loadReferralAccount,
    loadTreasuryView,
    resetReferralCopied,
    setMainView,
  })

  return {
    handleMainViewChange,
    myDomainsProps,
    myNamePrimarySummaries,
    myNames,
    pendingReservationCount,
    pendingReservationLabel,
  }
}
