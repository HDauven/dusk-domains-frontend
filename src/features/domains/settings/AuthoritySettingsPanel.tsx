import { ArrowRight, Info } from 'lucide-react'
import { FieldShell, TextField } from '../../../components/ui/FormControls'
import { abbreviate } from '../../../utils/format'
import { ManagementFeedback } from '../ManagementFeedback'
import type { AuthoritySettingsPanelProps } from './types'

export function AuthoritySettingsPanel({
  canChangeRecordSource,
  canManageName,
  confirmationInput,
  displayName,
  draftManager,
  draftOwner,
  draftResolver,
  managedName,
  managementError,
  managementTxState,
  onConfirmationInputChange,
  onDraftManagerChange,
  onDraftOwnerChange,
  onDraftResolverChange,
  onOwnershipUpdate,
  onResolverUpdate,
}: AuthoritySettingsPanelProps) {
  return (
    <>
      <div className="management-grid">
        <TextField
          id="owner-address"
          hint={[`Current: ${abbreviate(managedName.owner)}`, 'Dusk account or contract:0x...']}
          label="Owner authority"
          value={draftOwner}
          onChange={(event) => onDraftOwnerChange(event.target.value)}
        />

        <TextField
          id="manager-address"
          hint={[`Current: ${abbreviate(managedName.manager)}`, 'Dusk account or contract:0x...']}
          label="Manager authority"
          value={draftManager}
          onChange={(event) => onDraftManagerChange(event.target.value)}
        />

        <FieldShell className="resolver-control" label="Record source" labelFor="resolver-address">
          <input
            id="resolver-address"
            value={draftResolver}
            onChange={(event) => onDraftResolverChange(event.target.value)}
          />
          <div className="resolver-diff">
            <span>Old <code>{abbreviate(managedName.resolver)}</code></span>
            <ArrowRight size={15} />
            <span>New <code>{abbreviate(draftResolver)}</code></span>
          </div>
        </FieldShell>
      </div>

      <div className="public-warning record">
        <Info size={17} />
        <span>Owner authority can transfer. Manager authority can update records.</span>
      </div>

      <div className="confirm-row">
        <TextField
          id="management-confirm"
          label="Confirm name"
          placeholder={displayName}
          value={confirmationInput}
          onChange={(event) => onConfirmationInputChange(event.target.value)}
        />
        <button
          className="commit-button danger-action"
          disabled={!canManageName}
          type="button"
          onClick={() => void onOwnershipUpdate()}
        >
          Update authorities
        </button>
        <button
          className="commit-button danger-action"
          disabled={!canChangeRecordSource}
          type="button"
          onClick={() => void onResolverUpdate()}
        >
          Change record source
        </button>
      </div>

      <ManagementFeedback error={managementError} txState={managementTxState} />
    </>
  )
}
