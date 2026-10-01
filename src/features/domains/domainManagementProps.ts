import { resolveRecipient } from '../identity/resolveRecipient'
import type { DomainManagementFeatureProps, UseDomainManagementFeatureProps } from './domainManagementFeatureTypes'
import type { useDomainManagementActionHandlers } from './useDomainManagementActionHandlers'

export function buildDomainManagementProps(
  props: UseDomainManagementFeatureProps,
  actions: ReturnType<typeof useDomainManagementActionHandlers>,
): DomainManagementFeatureProps {
  return {
    primaryProps: {
      canClearPrimary: props.canClearPrimary,
      canSetPrimary: props.canSetPrimary,
      displayName: props.displayName,
      error: props.primaryError,
      onClearPrimary: () => void actions.handleClearPrimaryName(),
      onSetPrimary: () => void actions.handleSetPrimaryName(),
      primaryVerification: props.primaryVerification,
      txState: props.primaryTxState,
    },
    recordsProps: {
      canRemoveRecords: props.canRemoveRecords,
      canSaveRecords: props.canSaveRecords,
      criticalRecordChange: props.criticalRecordChange,
      displayName: props.displayName,
      editableRecordKeys: props.editableRecordKeys,
      error: props.recordError,
      onClearRecord: (record) => void actions.handleRecordClear(record),
      onDraftValueChange: (key, value) => {
        props.setRecordDrafts((current) => ({ ...current, [key]: value }))
        props.setRecordError('')
      },
      onDiscardDrafts: () => { props.setRecordDrafts({}); props.setRecordError(''); props.setRecordTxState(null) },
      onSaveRecords: () => actions.handleRecordsSave(),
      onUseWalletPublicAddress: () => {
        props.setRecordDrafts((current) => ({ ...current, moonlight_address: props.selectedAddress }))
        props.setRecordError('')
      },
      onUseWalletShieldedAddress: async () => {
        props.setRecordError('')
        try {
          const shieldedAddress = await props.requestSelectedShieldedAddress()
          props.setRecordDrafts((current) => ({ ...current, phoenix_payment_endpoint: shieldedAddress }))
        } catch (error) {
          props.setRecordError(error instanceof Error ? error.message : 'Could not get shielded address from wallet.')
        }
      },
      recordBusy: props.recordBusy,
      recordDraftErrors: props.recordDraftErrors,
      recordDraftValues: props.recordDraftValues,
      resolverRecords: props.resolverRecords,
      txState: props.recordTxState,
      walletAddressAvailable: Boolean(props.selectedAddress),
    },
    settingsProps: {
      canManageName: props.canManageName,
      canRenewName: props.canRenewName,
      confirmationInput: props.confirmationInput,
      currentBlockHeight: props.currentBlockHeight,
      displayName: props.displayName,
      feeConfigError: props.feeConfigError,
      feeConfigLoading: props.feeConfigLoading,
      managedName: props.managedName,
      managementError: props.managementError,
      managementTxState: props.managementTxState,
      maxDurationYears: props.maxDurationYears,
      minDurationYears: props.minDurationYears,
      nowSeconds: props.nowSeconds,
      onConfirmationInputChange: props.setConfirmationInput,
      viewerAuthority: props.selectedAuthority,
      ownerAddresses: props.moonlightRecord ? [props.moonlightRecord.value] : [],
      onResolveRecipient: input => resolveRecipient(input, props.indexerClient),
      onOwnershipUpdate: change => actions.handleOwnershipUpdate(change),
      onRenewName: () => void actions.handleRenewName(),
      onRenewalYearsChange: (years) => props.setRenewalYears(props.clampDurationYears(years)),
      renewalBusy: props.renewalBusy,
      renewalError: props.renewalError,
      renewalFee: props.renewalFee,
      renewalPreviewExpiresAt: props.renewalPreviewExpiresAt,
      renewalTxState: props.renewalTxState,
      renewalYears: props.renewalYears,
    },
    subdomainsProps: {
      canCreateSubname: props.canCreateSubname,
      currentBlockHeight: props.currentBlockHeight,
      displayName: props.displayName,
      error: props.subnameError,
      managedNameExpiresAt: props.managedName.expiresAt,
      nowSeconds: props.nowSeconds,
      onCreateSubname: () => void actions.handleCreateSubname(),
      onRecordTargetSelect: () => {},
      onSubnameExpiryDateChange: props.setSubnameExpiryDate,
      onSubnameExpiryPolicyChange: props.setSubnameExpiryPolicy,
      onSubnameLabelChange: props.setSubnameLabel,
      onSubnameManagerChange: props.setSubnameManager,
      selectedAuthority: props.selectedAuthority,
      subnameExpiryDate: props.subnameExpiryDate,
      subnameExpiryPolicy: props.subnameExpiryPolicy,
      subnameLabel: props.subnameLabel,
      subnameManager: props.subnameManager,
      subnames: props.subnames,
      txState: props.subnameTxState,
    },
  }
}
