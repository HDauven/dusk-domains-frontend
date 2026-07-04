import type { AppCoreRuntimes } from './useAppCoreRuntimes'
import type { AppNavigationRuntimes } from './useAppNavigationRuntimes'
import type { NameWorkspaceRuntime } from './useNameWorkspaceRuntime'
import { useBrowserUiProof } from './useBrowserUiProof'

export function useAppBrowserProofCapture({
  core,
  navigation,
  workspace,
}: {
  core: AppCoreRuntimes
  navigation: AppNavigationRuntimes
  workspace: NameWorkspaceRuntime
}) {
  const {
    appRuntime,
    domainState,
    registrationState,
    searchState,
    walletRuntime,
  } = core
  const {
    derivedState,
    namePreview,
    registrationRuntime,
  } = workspace
  const {
    mainViewRuntime,
  } = navigation
  const {
    browserWriteProofUrl,
    runtimeConfig,
  } = appRuntime
  const {
    checked,
    currentBlockHeight,
    mainView,
    resultView,
  } = searchState
  const {
    commitTxState,
    registrationCompletion,
    txState,
  } = registrationState
  const {
    managementTxState,
    primaryTxState,
    recordTxState,
    renewalTxState,
    subnameTxState,
  } = domainState
  const {
    savedReservation,
    savedReservationWindow,
  } = derivedState
  const {
    displayName,
  } = namePreview
  const {
    pendingReservations,
  } = registrationRuntime
  const {
    myNamePrimarySummaries,
    myNames,
  } = mainViewRuntime
  const {
    selectedAddress,
    walletState,
  } = walletRuntime

  useBrowserUiProof({
    captureUrl: browserWriteProofUrl,
    chainId: runtimeConfig.chainId,
    checked,
    commitTxState,
    currentBlockHeight,
    displayName,
    liveWritesEnabled: runtimeConfig.liveWritesEnabled,
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
  })
}
