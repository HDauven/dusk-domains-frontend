import { registrationCommitWindow } from '../../names/internal'
import { deriveBusyState } from './busyState'
import { canManageActiveName, deriveManagementCapabilities } from './managementCapabilities'
import { derivePrimaryState } from './primaryState'
import { deriveRecordCapabilities } from './recordCapabilities'
import {
  findSavedReservation,
  selectedDelegatedSubname,
} from './reservationState'
import { deriveRegistrationCapabilities } from './registrationCapabilities'
import type { UseAppDerivedStateArgs } from './types'

export function deriveAppDerivedState({
  activeRecordTarget,
  canRegister,
  commitTxState,
  committed,
  confirmationInput,
  criticalRecordChange,
  criticalRecordConfirmationMatches,
  currentBlockHeight,
  delegateSubnameNode,
  displayName,
  managedName,
  managementTxState,
  moonlightRecord,
  nodeHex,
  pendingReservations,
  preparedCommit,
  primaryEndpointValue,
  primaryName,
  primaryTxState,
  publicRecordAcknowledged,
  recordDraftErrors,
  recordDraftMutations,
  recordTxState,
  registrationCompletion,
  registrationTargetReady,
  renewalTxState,
  selectedAddress,
  selectedAuthority,
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
    canRevealRegistration,
    commitStale,
  } = deriveRegistrationCapabilities({
    canRegister,
    commitBusy,
    committed,
    commitWindow,
    nodeHex,
    preparedCommit,
    registrationCompletion,
    registrationTargetReady,
    selectedAddress,
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
    criticalRecordChange,
    criticalRecordConfirmationMatches,
    nodeHex,
    primaryBusy,
    primaryEndpoint,
    primaryEndpointErrors,
    primaryName,
    primaryVerified: primaryVerification.verified,
    publicRecordAcknowledged,
    recordBusy,
    recordDraftErrors,
    recordDraftMutations,
    renewalBusy,
    selectedAddress,
    subnameBusy,
    subnameLabel,
    subnameManager,
    walletAuthorized: walletSigningReady,
  })

  const parentAuthorized = canManageActiveName(managedName, selectedAuthority, currentBlockHeight)
  const recordTarget = activeRecordTarget?.node === nodeHex ? managedName
    : subnames.find(name => name.node === activeRecordTarget?.node && name.status === 'active')
  const recordAuthorized = canManageActiveName(recordTarget, selectedAuthority, currentBlockHeight)

  return {
    canChangeRecordSource: false,
    canClearPrimary,
    canCreateSubname: canCreateSubname && parentAuthorized,
    canDelegateSubname: false,
    canManageName: canManageName && parentAuthorized,
    canPrepareCommit,
    canRenewName: canRenewName && parentAuthorized,
    canRevealRegistration,
    canRevokeSelectedSubname: false,
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
    savedReservation,
    savedReservationWindow,
    selectedDelegatedSubname: selectedDelegatedSubname(subnames, delegateSubnameNode),
    subnameBusy,
    txBusy,
  }
}
