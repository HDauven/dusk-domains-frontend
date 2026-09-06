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
      onBack: props.onBackToDetails,
      onClearPrimary: () => void actions.handleClearPrimaryName(),
      onEndpointChange: (value) => {
        props.setPrimaryEndpointValue(value)
        props.setPrimaryError('')
      },
      onSetPrimary: () => void actions.handleSetPrimaryName(),
      placeholder: props.selectedAddress || props.moonlightRecord?.value || 'dusk1...',
      primaryEndpointValue: props.primaryEndpointValue,
      primaryVerification: props.primaryVerification,
      txState: props.primaryTxState,
    },
    recordsProps: {
      activeRecordTarget: props.activeRecordTarget,
      canRemoveRecords: props.canRemoveRecords,
      canSaveRecords: props.canSaveRecords,
      criticalRecordChange: props.criticalRecordChange,
      criticalRecordConfirmation: props.criticalRecordConfirmation,
      displayName: props.displayName,
      editableRecordKeys: props.editableRecordKeys,
      error: props.recordError,
      onBack: props.onBackToDetails,
      onClearRecord: (record) => void actions.handleRecordClear(record),
      onCriticalRecordConfirmationChange: props.setCriticalRecordConfirmation,
      onDraftValueChange: (key, value) => {
        props.setRecordDrafts((current) => ({ ...current, [key]: value }))
        props.setRecordError('')
      },
      onPublicRecordAcknowledgedChange: props.setPublicRecordAcknowledged,
      onRecordTargetChange: (node) => {
        props.setRecordTargetNode(node)
        props.setRecordError('')
        props.setRecordDrafts({})
        props.setPublicRecordAcknowledged(false)
        props.setCriticalRecordConfirmation('')
      },
      onSaveRecords: () => void actions.handleRecordsSave(),
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
      publicRecordAcknowledged: props.publicRecordAcknowledged,
      recordBusy: props.recordBusy,
      recordDraftErrors: props.recordDraftErrors,
      recordDraftMutationCount: props.recordDraftMutations.length,
      recordDraftValues: props.recordDraftValues,
      recordTargetOptions: props.recordTargetOptions,
      resolverRecords: props.resolverRecords,
      txState: props.recordTxState,
      walletAddressAvailable: Boolean(props.selectedAddress),
    },
    settingsProps: {
      canChangeRecordSource: props.canChangeRecordSource,
      canManageName: props.canManageName,
      canRenewName: props.canRenewName,
      confirmationInput: props.confirmationInput,
      currentBlockHeight: props.currentBlockHeight,
      displayName: props.displayName,
      draftManager: props.draftManager,
      draftOwner: props.draftOwner,
      draftResolver: props.draftResolver,
      feeConfigError: props.feeConfigError,
      feeConfigLoading: props.feeConfigLoading,
      managedName: props.managedName,
      managementError: props.managementError,
      managementTxState: props.managementTxState,
      maxDurationYears: props.maxDurationYears,
      minDurationYears: props.minDurationYears,
      nowSeconds: props.nowSeconds,
      onBack: props.onBackToDetails,
      onConfirmationInputChange: props.setConfirmationInput,
      onDraftManagerChange: props.setDraftManager,
      onDraftOwnerChange: props.setDraftOwner,
      onDraftResolverChange: props.setDraftResolver,
      onOwnershipUpdate: () => void actions.handleOwnershipUpdate(),
      onRenewName: () => void actions.handleRenewName(),
      onRenewalYearsChange: (years) => props.setRenewalYears(props.clampDurationYears(years)),
      onResolverUpdate: () => void actions.handleResolverUpdate(),
      renewalBusy: props.renewalBusy,
      renewalError: props.renewalError,
      renewalFee: props.renewalFee,
      renewalPreviewExpiresAt: props.renewalPreviewExpiresAt,
      renewalTxState: props.renewalTxState,
      renewalYears: props.renewalYears,
    },
    subdomainsProps: {
      canCreateSubname: props.canCreateSubname,
      canDelegateSubname: props.canDelegateSubname,
      canRevokeSelectedSubname: props.canRevokeSelectedSubname,
      currentBlockHeight: props.currentBlockHeight,
      delegateManager: props.delegateManager,
      delegateSubnameNode: props.delegateSubnameNode,
      displayName: props.displayName,
      error: props.subnameError,
      fallbackManager: props.fallbackManager,
      managedNameExpiresAt: props.managedName.expiresAt,
      nowSeconds: props.nowSeconds,
      onBack: props.onBackToDetails,
      onCreateSubname: () => void actions.handleCreateSubname(),
      onDelegateManagerChange: props.setDelegateManager,
      onDelegateSubnameChange: props.setDelegateSubnameNode,
      onDelegateSubnameSubmit: () => void actions.handleDelegateSubname(),
      onRecordTargetSelect: (subname) => {
        props.setRecordTargetNode(subname.node)
        props.setRecordDrafts({})
        props.setRecordError('')
        props.setPublicRecordAcknowledged(false)
        props.setCriticalRecordConfirmation('')
      },
      onRevokeSubname: () => void actions.handleRevokeSubname(),
      onSubnameExpiryDateChange: props.setSubnameExpiryDate,
      onSubnameExpiryPolicyChange: props.setSubnameExpiryPolicy,
      onSubnameLabelChange: props.setSubnameLabel,
      onSubnameManagerChange: props.setSubnameManager,
      onSubnameResolverChange: props.setSubnameResolver,
      onSubnameRevocationPolicyChange: props.setSubnameRevocationPolicy,
      selectedAuthority: props.selectedAuthority,
      subnameExpiryDate: props.subnameExpiryDate,
      subnameExpiryPolicy: props.subnameExpiryPolicy,
      subnameLabel: props.subnameLabel,
      subnameManager: props.subnameManager,
      subnameResolver: props.subnameResolver,
      subnameRevocationPolicy: props.subnameRevocationPolicy,
      subnames: props.subnames,
      txState: props.subnameTxState,
    },
  }
}
