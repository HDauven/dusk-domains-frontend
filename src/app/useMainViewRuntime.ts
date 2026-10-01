import type { WalletConnectionStatus } from '../features/wallet/walletStatus'
import type { Dispatch, SetStateAction } from 'react'
import type { DuskDomainsIndexerClient, PendingNameReservation } from '../names/internal'
import type { AppMainView } from './AppTypes'
import { useAppNavigation } from './useAppNavigation'
import { useMyDomainsFeature } from '../features/domains/useMyDomainsFeature'

export type UseMainViewRuntimeArgs = {
  walletStatus?: WalletConnectionStatus
  currentBlockHeight: number | null
  indexerClient: DuskDomainsIndexerClient | null
  loadPendingReservations: () => unknown
  loadReferralAccount: () => Promise<unknown>
  loadTreasuryView: (options?: { fresh?: boolean }) => Promise<boolean>
  mainView: AppMainView
  onConnectWallet: () => void
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
  walletStatus,
  currentBlockHeight,
  indexerClient,
  loadPendingReservations,
  loadReferralAccount,
  loadTreasuryView,
  mainView,
  onConnectWallet,
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
  } = useMyDomainsFeature({
    walletStatus,
    currentBlockHeight,
    indexerClient,
    mainView,
    onBlockHeightChange: setCurrentBlockHeight,
    onConnectWallet,
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
  }
}
