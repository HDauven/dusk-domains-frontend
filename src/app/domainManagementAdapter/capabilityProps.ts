import type { AppViewModelInputs } from '../appViewTypes'

export function buildDomainManagementCapabilityProps({
  derivedState,
}: AppViewModelInputs) {
  const {
    canChangeRecordSource,
    canClearPrimary,
    canCreateSubname,
    canDelegateSubname,
    canManageName,
    canRenewName,
    canRevokeSelectedSubname,
    canSaveRecords,
    primaryEndpoint,
    primaryVerification,
    recordBusy,
    renewalBusy,
    selectedDelegatedSubname,
  } = derivedState

  return {
    canChangeRecordSource,
    canClearPrimary,
    canCreateSubname,
    canDelegateSubname,
    canManageName,
    canRenewName,
    canRevokeSelectedSubname,
    canSaveRecords,
    canSetPrimary: derivedState.canSetPrimary,
    primaryEndpoint,
    primaryVerification,
    recordBusy,
    renewalBusy,
    selectedDelegatedSubname,
  }
}
