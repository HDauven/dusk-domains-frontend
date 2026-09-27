import { Info } from 'lucide-react'
import { TextField } from '../../../components/ui/FormControls'
import { abbreviate } from '../../../utils/format'
import { ManagementFeedback } from '../ManagementFeedback'
import type { AuthoritySettingsPanelProps } from './types'

export function AuthoritySettingsPanel({
  canManageName,
  confirmationInput,
  displayName,
  draftManager,
  draftOwner,
  managedName,
  managementError,
  managementTxState,
  onConfirmationInputChange,
  onDraftManagerChange,
  onDraftOwnerChange,
  onOwnershipUpdate,
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
      </div>

      <ManagementFeedback error={managementError} txState={managementTxState} />
    </>
  )
}
