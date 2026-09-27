import { PanelHeader } from '../../components/ui/PanelHeader'
import { AuthoritySettingsPanel } from './settings/AuthoritySettingsPanel'
import { RenewalPanel } from './settings/RenewalPanel'
import type { DomainSettingsViewProps } from './settings/types'

export function DomainSettingsView({
  canManageName,
  canRenewName,
  confirmationInput,
  currentBlockHeight,
  displayName,
  draftManager,
  draftOwner,
  feeConfigError,
  feeConfigLoading,
  managedName,
  managementError,
  managementTxState,
  maxDurationYears,
  minDurationYears,
  nowSeconds,
  onConfirmationInputChange,
  onDraftManagerChange,
  onDraftOwnerChange,
  onOwnershipUpdate,
  onRenewName,
  onRenewalYearsChange,
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
        headingId="management-heading"
        subtitle={`Who owns ${displayName}, who manages it, and how long it lasts.`}
        title="Settings"
      />

      <AuthoritySettingsPanel
        canManageName={canManageName}
        confirmationInput={confirmationInput}
        displayName={displayName}
        draftManager={draftManager}
        draftOwner={draftOwner}
        managedName={managedName}
        managementError={managementError}
        managementTxState={managementTxState}
        onConfirmationInputChange={onConfirmationInputChange}
        onDraftManagerChange={onDraftManagerChange}
        onDraftOwnerChange={onDraftOwnerChange}
        onOwnershipUpdate={onOwnershipUpdate}
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
