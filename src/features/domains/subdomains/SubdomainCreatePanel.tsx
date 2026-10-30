import { useEffect, useRef, useState } from 'react'
import { sameAuthority } from '../../identity/ownerLabel'
import { Button } from '../../../components/ui/Button'
import {
  subnameExpiryDescription,
  type SubnameExpiryPolicy,
} from '../../../names/internal'
import { SelectField, TextField } from '../../../components/ui/FormControls'
import type { SubdomainCreatePanelProps } from './types'

export function SubdomainCreatePanel({ displayName, parentExpiryDay, subdomainPreview, creation, authority }: SubdomainCreatePanelProps) {
  const {
    canCreateSubname,
    onCreateSubname,
    onSubnameExpiryDateChange,
    onSubnameExpiryPolicyChange,
    onSubnameLabelChange,
    onSubnameManagerChange,
    subnameExpiryDate,
    subnameExpiryPolicy,
    subnameLabel,
    subnameManager,
  } = creation
  const {
    selectedAuthority,
  } = authority
  // Before the wallet opens, show the full address entered as manager: it receives control of
  // the new name's records. A subname you manage yourself needs no review.
  const manager = subnameManager.trim()
  const managedByOther = Boolean(manager && !sameAuthority(manager, selectedAuthority))
  const [reviewing, setReviewing] = useState(false)
  const showReview = reviewing && managedByOther
  // Focus moves into the review when Create subname opens it. When the wallet opens or Edit closes
  // it, focus goes back to Create subname, or to the label while that button can't be used. Editing
  // the manager closes the review, so typing never reopens it.
  const reviewRef = useRef<HTMLDivElement>(null)
  const createRef = useRef<HTMLButtonElement>(null)
  const labelRef = useRef<HTMLInputElement>(null)
  const returnFocus = useRef(false)
  useEffect(() => {
    if (showReview) reviewRef.current?.focus()
    else if (returnFocus.current) {
      returnFocus.current = false
      if (createRef.current && !createRef.current.disabled) createRef.current.focus()
      else labelRef.current?.focus()
    }
  }, [showReview])
  const closeReview = () => { if (showReview) returnFocus.current = true; setReviewing(false) }
  const create = () => { closeReview(); void onCreateSubname() }
  return (
    <>
      <div>
        <h3>Create subname</h3>
        <p>Create a name such as docs.{displayName}. Reserved words are allowed in subnames.</p>
      </div>

      <div className="subname-quick-create field-row">
        <TextField
          ref={labelRef}
          id="subname-label"
          hint={subdomainPreview}
          label="Label"
          value={subnameLabel}
          onChange={(event) => onSubnameLabelChange(event.target.value)}
        />

        <div className="field-action">
          <Button
            ref={createRef}
            disabled={!canCreateSubname || showReview}
            type="button"
            onClick={() => managedByOther ? setReviewing(true) : create()}
          >
            Create subname
          </Button>
        </div>
      </div>

      {showReview ? (
        <div className="subname-review" role="group" aria-label={`Review ${subdomainPreview}`} tabIndex={-1} ref={reviewRef}>
          <dl>
            <div><dt>Name</dt><dd>{subdomainPreview}</dd></div>
            <div><dt>Owner</dt><dd>You</dd></div>
            <div><dt>Manager</dt><dd><code>{manager}</code></dd></div>
          </dl>
          <p>Check the manager address. That wallet can change the name's records and create subnames below it. You stay its owner and can take it back.</p>
          <div className="subname-review-actions">
            <Button variant="primary" disabled={!canCreateSubname} type="button" onClick={create}>Create in wallet</Button>
            <Button type="button" onClick={closeReview}>Edit</Button>
          </div>
        </div>
      ) : null}

      <details className="subname-advanced">
        <summary>Ownership and policy</summary>
        <div className="subname-editor field-row">
          <TextField
            id="subname-manager"
            hint="Leave empty to manage it yourself. Otherwise enter a Dusk address."
            label="Manager"
            placeholder="Dusk address"
            value={subnameManager === selectedAuthority ? '' : subnameManager}
            onChange={(event) => { setReviewing(false); onSubnameManagerChange(event.target.value) }}
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
