import { Panel } from '../../components/ui/Panel'
import { canRenewOutsideEscrow } from '../../app/managedNameState'
import { PanelHeader } from '../../components/ui/PanelHeader'
import { isSubname } from './domainFormat'
import { RecipientSettingsPanel } from './settings/RecipientSettingsPanel'
import { RenewalPanel } from './settings/RenewalPanel'
import { SubnameExpiryPanel } from './settings/SubnameExpiryPanel'
import type { DomainSettingsViewProps } from './settings/types'

export function DomainSettingsView({
  isOwner = true,
  canManageName,
  canRenewName,
  confirmationInput,
  currentBlockHeight,
  displayName,
  feeConfigError,
  feeConfigLoading,
  managedName,
  managementError,
  managementTxState,
  maxDurationYears,
  minDurationYears,
  nowSeconds,
  onConfirmationInputChange,
  onOwnershipUpdate,
  onResolveRecipient,
  viewerAuthority,
  ownerAddresses,
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
    <Panel className="management-panel" id="my-names" aria-labelledby="management-heading">
      <PanelHeader
        headingId="management-heading"
        subtitle={`Who owns ${displayName}, who manages it, and how long it lasts.`}
        title="Settings"
      />

      {isOwner ? <RecipientSettingsPanel
        canManageName={canManageName}
        confirmationInput={confirmationInput}
        displayName={displayName}
        managedName={managedName}
        managementError={managementError}
        managementTxState={managementTxState}
        onConfirmationInputChange={onConfirmationInputChange}
        onOwnershipUpdate={onOwnershipUpdate}
        onResolveRecipient={onResolveRecipient}
        viewerAuthority={viewerAuthority}
        ownerAddresses={ownerAddresses}
      /> : null}

      {isSubname(displayName) ? (
        <SubnameExpiryPanel
          currentBlockHeight={currentBlockHeight}
          displayName={displayName}
          managedName={managedName}
          nowSeconds={nowSeconds}
        />
      ) : managedName.inMarketplaceEscrow ? (
        <p>Renewal is available after the listing closes.</p>
      ) : !canRenewOutsideEscrow(managedName) ? (
        <p>Renewal is unavailable until marketplace custody can be checked.</p>
      ) : (
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
      )}
    </Panel>
  )
}

export type { DomainSettingsViewProps, ManagedNameState } from './settings/types'
