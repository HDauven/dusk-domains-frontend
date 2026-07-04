import { useCallback, useEffect, useRef } from 'react'
import type { AppMainView } from './AppTypes'
import type { MyNamePrimarySummary } from '../features/domains/MyDomainsView'
import type { SearchResultView } from '../features/search/SearchWorkspace'
import {
  myNamesProofConfirmation,
  reservationSearchProofConfirmation,
} from './browserUiProofConfirmations'
import type { RegistrationCompletionState } from '../features/registration/registrationCompletionState'
import { selectedWalletProviderName } from '../features/wallet/walletStatus'
import {
  recordBrowserWriteProofUiConfirmation,
  type DuskNameTxState,
  type DuskWalletState,
  type IndexedNameSummary,
  type PendingNameReservation,
  type RegistrationCommitWindow,
} from '../names/internal'

type UseBrowserUiProofArgs = {
  captureUrl: string | undefined
  chainId: string
  checked: boolean
  commitTxState: DuskNameTxState | null
  currentBlockHeight: number | null
  displayName: string
  liveWritesEnabled: boolean
  mainView: AppMainView
  managementTxState: DuskNameTxState | null
  myNamePrimarySummaries: Record<string, MyNamePrimarySummary>
  myNames: IndexedNameSummary[]
  pendingReservations: PendingNameReservation[]
  primaryTxState: DuskNameTxState | null
  recordTxState: DuskNameTxState | null
  registrationCompletion: RegistrationCompletionState | null
  renewalTxState: DuskNameTxState | null
  resultView: SearchResultView
  savedReservation: PendingNameReservation | null
  savedReservationWindow: RegistrationCommitWindow | null
  selectedAddress: string
  subnameTxState: DuskNameTxState | null
  txState: DuskNameTxState | null
  walletState: DuskWalletState
}

export function useBrowserUiProof({
  captureUrl,
  chainId,
  checked,
  commitTxState,
  currentBlockHeight,
  displayName,
  liveWritesEnabled,
  mainView,
  managementTxState,
  myNamePrimarySummaries,
  myNames,
  pendingReservations,
  primaryTxState,
  recordTxState,
  registrationCompletion,
  renewalTxState,
  resultView,
  savedReservation,
  savedReservationWindow,
  selectedAddress,
  subnameTxState,
  txState,
  walletState,
}: UseBrowserUiProofArgs) {
  const browserUiProofKeys = useRef(new Set<string>())

  const recordBrowserUiProof = useCallback((
    kind: 'myNames' | 'reservationSearch',
    name: string,
    confirmation: Parameters<typeof recordBrowserWriteProofUiConfirmation>[0]['confirmation'],
  ) => {
    if (!liveWritesEnabled || !selectedAddress) return
    const canonicalName = name.trim().toLowerCase()
    if (!canonicalName.endsWith('.dusk')) return

    const proofKey = `${kind}:${chainId}:${canonicalName}:${selectedAddress}`
    if (browserUiProofKeys.current.has(proofKey)) return

    try {
      const recorded = recordBrowserWriteProofUiConfirmation({
        chainId,
        name: canonicalName,
        account: selectedAddress,
        provider: selectedWalletProviderName(walletState),
        kind,
        confirmation,
        captureUrl,
      })
      if (recorded) browserUiProofKeys.current.add(proofKey)
    } catch {
      // Proof capture must never block the user flow.
    }
  }, [captureUrl, chainId, liveWritesEnabled, selectedAddress, walletState])

  useEffect(() => {
    if (mainView !== 'my-names') return

    const proof = myNamesProofConfirmation({
      commitTxState,
      currentBlockHeight,
      managementTxState,
      myNamePrimarySummaries,
      myNames,
      pendingReservations,
      primaryTxState,
      recordTxState,
      registrationCompletion,
      renewalTxState,
      subnameTxState,
      txState,
    })
    if (proof) recordBrowserUiProof('myNames', proof.name, proof.confirmation)
  }, [
    commitTxState,
    currentBlockHeight,
    mainView,
    managementTxState,
    myNamePrimarySummaries,
    myNames,
    pendingReservations,
    primaryTxState,
    recordBrowserUiProof,
    recordTxState,
    registrationCompletion,
    renewalTxState,
    subnameTxState,
    txState,
  ])

  useEffect(() => {
    if (mainView !== 'search' || !checked || resultView !== 'overview') return

    const proof = reservationSearchProofConfirmation({
      displayName,
      savedReservation,
      savedReservationWindow,
    })
    if (proof) recordBrowserUiProof('reservationSearch', proof.name, proof.confirmation)
  }, [
    checked,
    displayName,
    mainView,
    recordBrowserUiProof,
    resultView,
    savedReservation,
    savedReservationWindow,
  ])
}
