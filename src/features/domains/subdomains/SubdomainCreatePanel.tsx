import { Button } from '../../../components/ui/Button'
import {
  subnameExpiryDescription,
  type SubnameExpiryPolicy,
} from '../../../names/internal'
import { SelectField, TextField } from '../../../components/ui/FormControls'
import type { SubdomainCreatePanelProps } from './types'

export function SubdomainCreatePanel({
  canCreateSubname,
  displayName,
  onCreateSubname,
  onSubnameExpiryDateChange,
  onSubnameExpiryPolicyChange,
  onSubnameLabelChange,
  onSubnameManagerChange,
  parentExpiryDay,
  selectedAuthority,
  subdomainPreview,
  subnameExpiryDate,
  subnameExpiryPolicy,
  subnameLabel,
  subnameManager,
}: SubdomainCreatePanelProps) {
  return (
    <>
      <div>
        <h3>Create subname</h3>
        <p>Create a name such as pay.{displayName}.</p>
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
          <Button
            className="save-record"
            disabled={!canCreateSubname}
            type="button"
            onClick={() => void onCreateSubname()}
          >
            Create subname
          </Button>
        </div>
      </div>

      <details className="subname-advanced">
        <summary>Ownership and policy</summary>
        <div className="subname-editor">
          <TextField
            id="subname-manager"
            hint="Leave empty to manage it yourself. Otherwise enter a Dusk address."
            label="Manager"
            placeholder="Dusk address"
            value={subnameManager === selectedAuthority ? '' : subnameManager}
            onChange={(event) => onSubnameManagerChange(event.target.value)}
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

        </div>
      </details>
    </>
  )
}
