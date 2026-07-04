import type {
  DomainManagementFeatureProps,
  UseDomainManagementFeatureProps,
} from '../domainManagementFeatureTypes'
import type { AsyncAction } from './types'

type SettingsPropsArgs = Pick<
  UseDomainManagementFeatureProps,
  | 'canChangeRecordSource'
  | 'canManageName'
  | 'canRenewName'
  | 'clampDurationYears'
  | 'confirmationInput'
  | 'currentBlockHeight'
  | 'displayName'
  | 'draftManager'
  | 'draftOwner'
  | 'draftResolver'
  | 'feeConfigError'
  | 'feeConfigLoading'
  | 'managedName'
  | 'managementError'
  | 'managementTxState'
  | 'maxDurationYears'
  | 'minDurationYears'
  | 'nowSeconds'
  | 'onBackToDetails'
  | 'renewalBusy'
  | 'renewalError'
  | 'renewalFee'
  | 'renewalPreviewExpiresAt'
  | 'renewalTxState'
  | 'renewalYears'
  | 'setConfirmationInput'
  | 'setDraftManager'
  | 'setDraftOwner'
  | 'setDraftResolver'
  | 'setRenewalYears'
> & {
  handleOwnershipUpdate: AsyncAction
  handleRenewName: AsyncAction
  handleResolverUpdate: AsyncAction
}

export function buildSettingsProps({
  canChangeRecordSource,
  canManageName,
  canRenewName,
  clampDurationYears,
  confirmationInput,
  currentBlockHeight,
  displayName,
  draftManager,
  draftOwner,
  draftResolver,
  feeConfigError,
  feeConfigLoading,
  handleOwnershipUpdate,
  handleRenewName,
  handleResolverUpdate,
  managedName,
  managementError,
  managementTxState,
  maxDurationYears,
  minDurationYears,
  nowSeconds,
  onBackToDetails,
  renewalBusy,
  renewalError,
  renewalFee,
  renewalPreviewExpiresAt,
  renewalTxState,
  renewalYears,
  setConfirmationInput,
  setDraftManager,
  setDraftOwner,
  setDraftResolver,
  setRenewalYears,
}: SettingsPropsArgs): DomainManagementFeatureProps['settingsProps'] {
  return {
    canChangeRecordSource,
    canManageName,
    canRenewName,
    confirmationInput,
    currentBlockHeight,
    displayName,
    draftManager,
    draftOwner,
    draftResolver,
    feeConfigError,
    feeConfigLoading,
    managedName,
    managementError,
    managementTxState,
    maxDurationYears,
    minDurationYears,
    nowSeconds,
    onBack: onBackToDetails,
    onConfirmationInputChange: setConfirmationInput,
    onDraftManagerChange: setDraftManager,
    onDraftOwnerChange: setDraftOwner,
    onDraftResolverChange: setDraftResolver,
    onOwnershipUpdate: () => void handleOwnershipUpdate(),
    onRenewName: () => void handleRenewName(),
    onRenewalYearsChange: (years) => setRenewalYears(clampDurationYears(years)),
    onResolverUpdate: () => void handleResolverUpdate(),
    renewalBusy,
    renewalError,
    renewalFee,
    renewalPreviewExpiresAt,
    renewalTxState,
    renewalYears,
  }
}
