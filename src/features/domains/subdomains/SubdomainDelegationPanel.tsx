import { SelectField, TextField } from '../../../components/ui/FormControls'
import type { SubdomainDelegationPanelProps } from './types'

export function SubdomainDelegationPanel({
  canDelegateSubname,
  canRevokeSelectedSubname,
  delegateManager,
  delegateSubnameNode,
  fallbackManager,
  onDelegateManagerChange,
  onDelegateSubnameChange,
  onDelegateSubnameSubmit,
  onRevokeSubname,
  selectedAuthority,
  subnames,
}: SubdomainDelegationPanelProps) {
  return (
    <details className="subname-advanced">
      <summary>Delegate or revoke</summary>
      <div className="delegate-row">
        <SelectField
          id="delegate-subname"
          label="Subdomain"
          value={delegateSubnameNode}
          onChange={(event) => {
            const next = subnames.find((subname) => subname.node === event.target.value)
            onDelegateSubnameChange(event.target.value)
            onDelegateManagerChange(next?.manager ?? '')
          }}
        >
          <option value="">Choose subdomain</option>
          {subnames.map((subname) => (
            <option
              disabled={subname.status !== 'active'}
              key={subname.node}
              value={subname.node}
            >
              {subname.status === 'active' ? subname.name : `${subname.name} (revoked)`}
            </option>
          ))}
        </SelectField>
        <TextField
          id="delegate-manager"
          label="New manager"
          placeholder={selectedAuthority || fallbackManager}
          value={delegateManager}
          onChange={(event) => onDelegateManagerChange(event.target.value)}
        />
        <button
          className="commit-button save-record"
          disabled={!canDelegateSubname}
          type="button"
          onClick={() => void onDelegateSubnameSubmit()}
        >
          Delegate
        </button>
        <button
          className="commit-button danger-action"
          disabled={!canRevokeSelectedSubname}
          type="button"
          onClick={() => void onRevokeSubname()}
        >
          Revoke
        </button>
      </div>
    </details>
  )
}
