import { useCallback, useLayoutEffect, useRef } from 'react'
import { clampDurationYears, editableRecordKeys, maxDurationYears, minDurationYears } from '../../app/appConstants'
import { canControlSubname } from './namespaceActions'
import { resolveRecipient } from '../identity/resolveRecipient'
import type { DomainManagementFeatureProps, UseDomainManagementFeatureProps } from './domainManagementFeatureTypes'
import { usePrimaryDomainActions } from './usePrimaryDomainActions'
import { useDomainRecordActions } from './useDomainRecordActions'
import { useDomainSettingsActions } from './useDomainSettingsActions'
import { useSubdomainActions } from './useSubdomainActions'

export function useDomainManagementFeature({ activityFeed, appRuntime, derivedState, domainRecordState, domainState, economicsRuntime, namePreview, searchRuntime, searchState, walletRuntime }: UseDomainManagementFeatureProps): DomainManagementFeatureProps {
  const addressRequest = useRef({ generation: 0 })
  useLayoutEffect(() => {
    addressRequest.current.generation++
    const request = addressRequest.current
    return () => { request.generation++ }
  }, [namePreview.displayName, domainRecordState.recordDrafts, searchState.mainView, searchState.resultView, walletRuntime.selectedAddress, walletRuntime.walletState?.generation])
  const { setRecordDrafts } = domainRecordState
  const { setRecordError, setRecordTxState } = domainState
  const discardDrafts = useCallback(() => {
    addressRequest.current.generation++
    setRecordDrafts({})
    setRecordError('')
    setRecordTxState(null)
  }, [setRecordDrafts, setRecordError, setRecordTxState])
  const writes = {
    appendActivity: activityFeed.appendActivity,
    runtimeConfig: appRuntime.runtimeConfig,
    selectedAuthority: walletRuntime.selectedAuthority,
    shouldApplyPreviewWriteFallback: searchRuntime.shouldApplyPreviewWriteFallback,
    submitNameWrite: walletRuntime.submitNameWrite,
    walletSetupState: walletRuntime.walletSession.status,
    ensureContractAuthorityForLiveWrite: walletRuntime.ensureContractAuthorityForLiveWrite,
    ensurePublicBalanceForLiveWrite: walletRuntime.ensurePublicBalanceForLiveWrite,
  }
  const actions = {
    ...usePrimaryDomainActions({
      ...writes,
      canClearPrimary: derivedState.canClearPrimary,
      canSetPrimary: derivedState.canSetPrimary,
      displayName: namePreview.displayName,
      nodeHex: namePreview.nodeHex,
      primaryEndpoint: derivedState.primaryEndpoint,
      moonlightRecord: domainRecordState.moonlightRecord,
      selectedAddress: walletRuntime.selectedAddress,
      setPrimaryEndpointValue: domainState.setPrimaryEndpointValue,
      setPrimaryError: domainState.setPrimaryError,
      setConnectedPrimaryName: domainState.setConnectedPrimaryName,
      setPrimaryName: domainState.setPrimaryName,
      setPrimaryTxState: domainState.setPrimaryTxState,
    }),
    ...useDomainRecordActions({
      ...writes,
      activeRecordTarget: domainRecordState.activeRecordTarget,
      canRemoveRecords: derivedState.canRemoveRecords,
      canSaveRecords: derivedState.canSaveRecords,
      criticalRecordChange: domainRecordState.criticalRecordChange,
      nodeHex: namePreview.nodeHex,
      recordBusy: derivedState.recordBusy,
      recordDraftErrors: domainRecordState.recordDraftErrors,
      recordDraftMutations: domainRecordState.recordDraftMutations,
      selectedAddress: walletRuntime.selectedAddress,
      setPrimaryEndpointValue: domainState.setPrimaryEndpointValue,
      setRecordDrafts: domainRecordState.setRecordDrafts,
      setRecordError: domainState.setRecordError,
      setRecordTxState: domainState.setRecordTxState,
      setResolverRecordSets: domainRecordState.setResolverRecordSets,
      walletAuthorized: walletRuntime.walletSession.canSign,
    }),
    ...useDomainSettingsActions({
      ...writes,
      indexerClient: appRuntime.indexerClient,
      canManageName: derivedState.canManageName,
      canRenewName: derivedState.canRenewName,
      currentBlockHeight: searchState.currentBlockHeight,
      displayName: namePreview.displayName,
      feeConfig: economicsRuntime.feeConfig,
      lifecycleBaseBlockHeight: namePreview.lifecycleBaseBlockHeight,
      managedName: domainState.managedName,
      nodeHex: namePreview.nodeHex,
      nowSeconds: searchState.nowSeconds,
      renewalYears: domainState.renewalYears,
      resultLabel: namePreview.result.label,
      setManagedName: domainState.setManagedName,
      setManagementError: domainState.setManagementError,
      setManagementTxState: domainState.setManagementTxState,
      setRenewalError: domainState.setRenewalError,
      setRenewalTxState: domainState.setRenewalTxState,
    }),
    ...useSubdomainActions({
      ...writes,
      managedName: domainState.managedName,
      subnames: domainState.subnames,
      canCreateSubname: derivedState.canCreateSubname,
      currentBlockHeight: searchState.currentBlockHeight,
      displayName: namePreview.displayName,
      managedNameExpiresAt: domainState.managedName.expiresAt,
      nowSeconds: searchState.nowSeconds,
      selectedAddress: walletRuntime.selectedAddress,
      setRecordDrafts: domainRecordState.setRecordDrafts,
      setRecordError: domainState.setRecordError,
      setSubnameError: domainState.setSubnameError,
      setSubnames: domainState.setSubnames,
      setSubnameTxState: domainState.setSubnameTxState,
      subnameExpiryDate: domainState.subnameExpiryDate,
      subnameExpiryPolicy: domainState.subnameExpiryPolicy,
      subnameLabel: domainState.subnameLabel,
      subnameManager: domainState.subnameManager,
      recordSourceContractId: appRuntime.recordSourceContractId,
    }),
  }
  return {
    primaryProps: {
      canClearPrimary: derivedState.canClearPrimary,
      canSetPrimary: derivedState.canSetPrimary,
      displayName: namePreview.displayName,
      error: domainState.primaryError,
      onClearPrimary: () => void actions.handleClearPrimaryName(),
      onSetPrimary: () => void actions.handleSetPrimaryName(),
      primaryVerification: derivedState.primaryVerification,
      txState: domainState.primaryTxState,
    },
    recordsProps: {
      displayName: namePreview.displayName,
      editableRecordKeys: editableRecordKeys,
      resolverRecords: domainRecordState.resolverRecords,
      actions: {
        canRemoveRecords: derivedState.canRemoveRecords,
        canSaveRecords: derivedState.canSaveRecords,
        error: domainState.recordError,
        onClearRecord: (record) => void actions.handleRecordClear(record),
        onSaveRecords: () => { addressRequest.current.generation++; return actions.handleRecordsSave() },
        recordBusy: derivedState.recordBusy,
        txState: domainState.recordTxState,
      },
      draft: {
        criticalRecordChange: domainRecordState.criticalRecordChange,
        recordDraftMutations: domainRecordState.recordDraftMutations,
        onDraftValueChange: (key, value) => {
          addressRequest.current.generation++
          domainRecordState.setRecordDrafts((current) => ({ ...current, [key]: value }))
          domainState.setRecordError('')
        },
        onDiscardDrafts: discardDrafts,
        recordDraftErrors: domainRecordState.recordDraftErrors,
        recordDraftValues: domainRecordState.recordDraftValues,
      },
      wallet: {
        onUseWalletPublicAddress: () => {
          addressRequest.current.generation++
          domainRecordState.setRecordDrafts((current) => ({ ...current, moonlight_address: walletRuntime.selectedAddress }))
          domainState.setRecordError('')
        },
        onUseWalletShieldedAddress: async () => {
          const request = ++addressRequest.current.generation
          const workspace = walletRuntime.submitNameWrite.captureWorkspace(namePreview.displayName)
          const session = walletRuntime.submitNameWrite.captureSession(walletRuntime.selectedAddress)
          const isCurrent = () => request === addressRequest.current.generation && workspace() && session()
          domainState.setRecordError('')
          try {
            const shieldedAddress = await walletRuntime.requestSelectedShieldedAddress()
            if (!isCurrent()) return
            domainRecordState.setRecordDrafts((current) => isCurrent() ? { ...current, phoenix_payment_endpoint: shieldedAddress } : current)
          } catch (error) {
            if (!isCurrent()) return
            domainState.setRecordError(error instanceof Error ? error.message : 'Could not get shielded address from wallet.')
          }
        },
        walletAddressAvailable: Boolean(walletRuntime.selectedAddress),
      },
    },
    settingsProps: {
      displayName: namePreview.displayName,
      managedName: domainState.managedName,
      ownership: {
        canManageName: derivedState.canManageName,
        confirmationInput: domainState.confirmationInput,
        managementError: domainState.managementError,
        managementTxState: domainState.managementTxState,
        onConfirmationInputChange: domainState.setConfirmationInput,
        viewerAuthority: walletRuntime.selectedAuthority,
        ownerAddresses: domainRecordState.moonlightRecord ? [domainRecordState.moonlightRecord.value] : [],
        onResolveRecipient: input => resolveRecipient(input, appRuntime.indexerClient),
        onOwnershipUpdate: change => actions.handleOwnershipUpdate(change),
      },
      renewal: {
        canRenewName: derivedState.canRenewName,
        feeConfigError: economicsRuntime.feeConfigError,
        feeConfigLoading: economicsRuntime.feeConfigLoading,
        maxDurationYears: maxDurationYears,
        minDurationYears: minDurationYears,
        onRenewName: () => void actions.handleRenewName(),
        onRenewalYearsChange: (years) => domainState.setRenewalYears(clampDurationYears(years)),
        renewalBusy: derivedState.renewalBusy,
        renewalError: domainState.renewalError,
        renewalFee: namePreview.renewalFee,
        renewalPreviewExpiresAt: namePreview.renewalPreviewLifecycle.expiresAt,
        renewalTxState: domainState.renewalTxState,
        renewalYears: domainState.renewalYears,
      },
      clock: {
        currentBlockHeight: searchState.currentBlockHeight,
        nowSeconds: searchState.nowSeconds,
      },
    },
    subdomainsProps: {
      displayName: namePreview.displayName,
      error: domainState.subnameError,
      managedNameExpiresAt: domainState.managedName.expiresAt,
      onRecordTargetSelect: () => {},
      subnames: domainState.subnames,
      txState: domainState.subnameTxState,
      authority: {
        canControlSubname: subname => canControlSubname({ managedName: domainState.managedName, subnames: domainState.subnames, selectedAuthority: walletRuntime.selectedAuthority, currentBlockHeight: searchState.currentBlockHeight }, subname),
        onReassignSubname: actions.handleReassignSubname,
        onRemoveSubname: actions.handleRemoveSubname,
        onTakeBackSubname: actions.handleTakeBackSubname,
        selectedAuthority: walletRuntime.selectedAuthority,
      },
      creation: {
        canCreateSubname: derivedState.canCreateSubname,
        onCreateSubname: () => void actions.handleCreateSubname(),
        onSubnameExpiryDateChange: domainState.setSubnameExpiryDate,
        onSubnameExpiryPolicyChange: domainState.setSubnameExpiryPolicy,
        onSubnameLabelChange: domainState.setSubnameLabel,
        onSubnameManagerChange: domainState.setSubnameManager,
        subnameExpiryDate: domainState.subnameExpiryDate,
        subnameExpiryPolicy: domainState.subnameExpiryPolicy,
        subnameLabel: domainState.subnameLabel,
        subnameManager: domainState.subnameManager,
      },
      clock: {
        currentBlockHeight: searchState.currentBlockHeight,
        nowSeconds: searchState.nowSeconds,
      },
    },
  }
}
