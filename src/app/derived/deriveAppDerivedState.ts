import { registrationCommitWindow } from '../../names/internal'
import { deriveBusyState } from './busyState'
import { canManageActiveName, deriveManagementCapabilities } from './managementCapabilities'
import { derivePrimaryState } from './primaryState'
import { deriveRecordCapabilities } from './recordCapabilities'
import {
  findSavedReservation,
} from './reservationState'
import { deriveRegistrationCapabilities } from './registrationCapabilities'
import type { UseAppDerivedStateArgs } from './types'

export function deriveAppDerivedState({
  registrationsPaused,
  activeRecordTarget,
  canRegister,
  commitTxState,
  committed,
  confirmationInput,
  currentBlockHeight,
  displayName,
  managedName,
  managementTxState,
  moonlightRecord,
  nodeHex,
  nowSeconds,
  pendingReservations,
  preparedCommit,
  primaryEndpointValue,
  primaryName,
  connectedPrimaryName,
  primaryTxState,
  recordDraftErrors,
  recordDraftMutations,
  recordTxState,
  registrationCompletion,
  registrationTargetReady,
  renewalTxState,
  selectedAddress,
  selectedAuthority,
  strandedCommitment,
  subnameLabel,
  subnameManager,
  subnames,
  subnameTxState,
  txState,
  walletSigningReady,
}: UseAppDerivedStateArgs) {
  const {
    commitBusy,
    managementBusy,
    primaryBusy,
    recordBusy,
    renewalBusy,
    subnameBusy,
    txBusy,
  } = deriveBusyState({
    commitTxState,
    managementTxState,
    primaryTxState,
    recordTxState,
    renewalTxState,
    subnameTxState,
    txState,
  })
  const {
    primaryEndpoint,
    primaryEndpointErrors,
    primaryVerification,
  } = derivePrimaryState({
    displayName,
    moonlightRecord,
    primaryEndpointValue,
    primaryName,
    selectedAddress,
  })
  const commitWindow = registrationCommitWindow(preparedCommit?.committedBlockHeight, currentBlockHeight)
  const savedReservation = findSavedReservation({
    displayName,
    nodeHex,
    pendingReservations,
  })
  const savedReservationWindow = savedReservation
    ? registrationCommitWindow(savedReservation.committedBlockHeight, currentBlockHeight)
    : null
  const {
    canPrepareCommit,
    canRestartReservation,
    canRevealRegistration,
    commitStale,
    reservationStranded,
  } = deriveRegistrationCapabilities({
    registrationsPaused,
    canRegister,
    commitBusy,
    committed,
    commitWindow,
    nodeHex,
    preparedCommit,
    registrationCompletion,
    registrationTargetReady,
    selectedAddress,
    selectedAuthority,
    strandedCommitment,
    txBusy,
    walletAuthorized: walletSigningReady,
  })
  const {
    canManageName,
    connectedAsNameOwner,
    managementConfirmationMatches,
  } = deriveManagementCapabilities({
    confirmationInput,
    displayName,
    managedName,
    managementBusy,
    nodeHex,
    selectedAddress,
    selectedAuthority,
    walletAuthorized: walletSigningReady,
  })
  const {
    canClearPrimary,
    canCreateSubname,
    canRenewName,
    canSaveRecords,
    canSetPrimary,
  } = deriveRecordCapabilities({
    activeRecordTarget,
      currentBlockHeight,
    displayName,
    managedName,
    nodeHex,
    nowSeconds,
    primaryBusy,
    primaryEndpoint,
    primaryEndpointErrors,
    connectedPrimaryName,
    recordBusy,
    recordDraftErrors,
    recordDraftMutations,
    renewalBusy,
    selectedAddress,
    selectedAuthority,
    subnameBusy,
    subnameLabel,
    subnameManager,
    walletAuthorized: walletSigningReady,
  })

  const managedTarget = nodeHex && managedName.node === nodeHex ? managedName : undefined
  const parentAuthorized = canManageActiveName(managedTarget, selectedAuthority, currentBlockHeight)
  const recordTarget = activeRecordTarget?.node === nodeHex ? managedTarget
    : subnames.find(name => name.node === activeRecordTarget?.node && name.status === 'active')
  const recordAuthorized = canManageActiveName(recordTarget, selectedAuthority, currentBlockHeight)

  return {
    canClearPrimary,
    canCreateSubname: canCreateSubname && parentAuthorized,
    canManageName: canManageName && parentAuthorized,
    canPrepareCommit,
    canRenewName: canRenewName && Boolean(managedTarget) && currentBlockHeight !== null,
    canRestartReservation,
    canRevealRegistration,
    canRemoveRecords: walletSigningReady && recordAuthorized && !recordBusy,
    canSaveRecords: canSaveRecords && recordAuthorized,
    canSetPrimary: canSetPrimary && parentAuthorized,
    commitBusy,
    commitStale,
    commitWindow,
    connectedAsNameOwner,
    managementBusy,
    managementConfirmationMatches,
    primaryBusy,
    primaryEndpoint,
    primaryEndpointErrors,
    primaryVerification,
    recordBusy,
    renewalBusy,
    reservationStranded,
    savedReservation,
    savedReservationWindow,
    subnameBusy,
    txBusy,
  }
}
