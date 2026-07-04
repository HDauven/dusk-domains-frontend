import { PanelHeader } from '../../components/ui/PanelHeader'
import { AuthoritySettingsPanel } from './settings/AuthoritySettingsPanel'
import { RenewalPanel } from './settings/RenewalPanel'
import type { DomainSettingsViewProps } from './settings/types'

export function DomainSettingsView({
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
  onBack,
  onConfirmationInputChange,
  onDraftManagerChange,
  onDraftOwnerChange,
  onDraftResolverChange,
  onOwnershipUpdate,
  onRenewName,
  onRenewalYearsChange,
  onResolverUpdate,
  renewalBusy,
  renewalError,
  renewalFee,
  renewalPreviewExpiresAt,
  renewalTxState,
  renewalYears,
}: DomainSettingsViewProps) {
  return (
    <section className="management-panel" id="my-names" aria-labelledby="management-heading">
      <PanelHeader
        backLabel="Back to details"
        badge="Advanced"
        headingId="management-heading"
        onBack={onBack}
        subtitle={displayName}
        title="Domain settings"
      />

      <AuthoritySettingsPanel
        canChangeRecordSource={canChangeRecordSource}
        canManageName={canManageName}
        confirmationInput={confirmationInput}
        displayName={displayName}
        draftManager={draftManager}
        draftOwner={draftOwner}
        draftResolver={draftResolver}
        managedName={managedName}
        managementError={managementError}
        managementTxState={managementTxState}
        onConfirmationInputChange={onConfirmationInputChange}
        onDraftManagerChange={onDraftManagerChange}
        onDraftOwnerChange={onDraftOwnerChange}
        onDraftResolverChange={onDraftResolverChange}
        onOwnershipUpdate={onOwnershipUpdate}
        onResolverUpdate={onResolverUpdate}
      />

      <RenewalPanel
        canRenewName={canRenewName}
        currentBlockHeight={currentBlockHeight}
        feeConfigError={feeConfigError}
        feeConfigLoading={feeConfigLoading}
        managedName={managedName}
        maxDurationYears={maxDurationYears}
        minDurationYears={minDurationYears}
        nowSeconds={nowSeconds}
        onRenewName={onRenewName}
        onRenewalYearsChange={onRenewalYearsChange}
        renewalBusy={renewalBusy}
        renewalError={renewalError}
        renewalFee={renewalFee}
        renewalPreviewExpiresAt={renewalPreviewExpiresAt}
        renewalTxState={renewalTxState}
        renewalYears={renewalYears}
      />
    </section>
  )
}

export type { DomainSettingsViewProps, ManagedNameState } from './settings/types'
