import {
  subnameExpiryDescription,
  subnameRevocationDescription,
  type SubnameExpiryPolicy,
  type SubnameRevocationPolicy,
} from '../../../names/internal'
import { SelectField, TextField } from '../../../components/ui/FormControls'
import type { SubdomainCreatePanelProps } from './types'

export function SubdomainCreatePanel({
  canCreateSubname,
  displayName,
  fallbackManager,
  onCreateSubname,
  onSubnameExpiryDateChange,
  onSubnameExpiryPolicyChange,
  onSubnameLabelChange,
  onSubnameManagerChange,
  onSubnameResolverChange,
  onSubnameRevocationPolicyChange,
  parentExpiryDay,
  selectedAuthority,
  subdomainPreview,
  subnameExpiryDate,
  subnameExpiryPolicy,
  subnameLabel,
  subnameManager,
  subnameResolver,
  subnameRevocationPolicy,
}: SubdomainCreatePanelProps) {
  return (
    <>
      <div>
        <h3>Create subdomain</h3>
        <p>Use short operational labels such as settlement.{displayName}.</p>
      </div>

      <div className="subname-quick-create">
        <TextField
          id="subname-label"
          hint={subdomainPreview}
          label="Label"
          placeholder="settlement"
          value={subnameLabel}
          onChange={(event) => onSubnameLabelChange(event.target.value)}
        />

        <div className="subname-create-action">
          <button
            className="commit-button save-record"
            disabled={!canCreateSubname}
            type="button"
            onClick={() => void onCreateSubname()}
          >
            Create subdomain
          </button>
        </div>
      </div>

      <details className="subname-advanced">
        <summary>Ownership and policy</summary>
        <div className="subname-editor">
          <TextField
            id="subname-manager"
            hint="Use a Dusk public account or contract:0x..."
            label="Manager"
            placeholder={selectedAuthority || fallbackManager}
            value={subnameManager}
            onChange={(event) => onSubnameManagerChange(event.target.value)}
          />

          <TextField
            id="subname-resolver"
            hint="Independent record source for this subdomain"
            label="Record source"
            value={subnameResolver}
            onChange={(event) => onSubnameResolverChange(event.target.value)}
          />

          <SelectField
            id="subname-expiry-policy"
            hint={subnameExpiryDescription(subnameExpiryPolicy)}
            label="Expiry policy"
            value={subnameExpiryPolicy}
            onChange={(event) => onSubnameExpiryPolicyChange(event.target.value as SubnameExpiryPolicy)}
          >
            <option value="inherits_parent">Inherit parent expiry</option>
            <option value="fixed_before_parent">Fixed before parent expiry</option>
          </SelectField>

          <TextField
            id="subname-expiry-date"
            disabled={subnameExpiryPolicy === 'inherits_parent'}
            hint={`Parent expires ${parentExpiryDay}`}
            label="Fixed expiry"
            max={parentExpiryDay}
            type="date"
            value={subnameExpiryDate}
            onChange={(event) => onSubnameExpiryDateChange(event.target.value)}
          />

          <SelectField
            id="subname-revocation-policy"
            hint={subnameRevocationDescription(subnameRevocationPolicy)}
            label="Revocation"
            value={subnameRevocationPolicy}
            onChange={(event) => onSubnameRevocationPolicyChange(event.target.value as SubnameRevocationPolicy)}
          >
            <option value="parent_revocable">Parent can revoke</option>
            <option value="locked">Locked after creation</option>
          </SelectField>
        </div>
      </details>
    </>
  )
}
