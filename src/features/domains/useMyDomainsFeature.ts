import type { WalletConnectionStatus } from '../wallet/walletStatus'
import type { ComponentProps } from 'react'
import type { DuskDomainsIndexerClient, PendingNameReservation } from '../../names/internal'
import { MyDomainsView } from './MyDomainsView'
import { useMyDomains } from './useMyDomains'

export function useMyDomainsFeature({
  walletStatus,
  currentBlockHeight,
  indexerClient,
  mainView,
  onBlockHeightChange,
  onConnectWallet,
  onForgetPendingReservation,
  onLoadPendingReservations,
  onOpenIndexedName,
  onOpenPendingReservation,
  onSearchHome,
  pendingReservations,
  selectedAddress,
  selectedAuthority,
}: {
  walletStatus?: WalletConnectionStatus
  currentBlockHeight: number | null
  indexerClient: DuskDomainsIndexerClient | null
  mainView: string
  onBlockHeightChange: (height: number | null) => void
  onConnectWallet: () => void
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

  const myDomainsProps: ComponentProps<typeof MyDomainsView> = {
    walletStatus,
    currentBlockHeight,
    loading: myNamesLoading,
    myNames,
    myNamesError,
    onConnectWallet,
    onForgetPendingReservation,
    onOpenIndexedName,
    onOpenPendingReservation,
    onSearchHome,
    pendingReservations,
    primarySummaries: myNamePrimarySummaries,
    selectedAddress,
  }

  return {
    loadMyNames,
    myDomainsProps,
    myNamePrimarySummaries,
    myNames,
  }
}
