import { ArrowRight } from 'lucide-react'
import { SubnameAuthorityControls } from './SubnameAuthorityControls'
import { NameSignature } from '../../../components/ui/NameChip'
import { Badge } from '../../../components/ui/Badge'
import { followLink, routePath } from '../../../app/routes'
import {
  subnameExpiryDescription,
} from '../../../names/internal'
import { OwnerLabel } from '../../identity/OwnerLabel'
import { formatLifecycleDay } from '../domainFormat'
import type { SubdomainListProps } from './types'

export function SubdomainList({ onRecordTargetSelect, subnames, authority, clock }: SubdomainListProps) {
  const {
    ownerAddresses,
    canControlSubname,
    onReassignSubname,
    onRemoveSubname,
    onTakeBackSubname,
    selectedAuthority,
  } = authority
  const {
    currentBlockHeight,
    nowSeconds,
  } = clock
  return (
    <div className="subname-list">
      {subnames.map((subname) => (
        <div className="subname-row" key={subname.node}>
          <div className="subname-summary">
            {/* An active subname's name is a link to its own page, where its records and primary name are set. */}
            {subname.status === 'active' ? <a className="subname-open" href={routePath({ view: 'search', name: subname.name })}
              aria-label={`Open ${subname.name}`} onClick={event => followLink(event, () => onRecordTargetSelect(subname))}>
              <NameSignature name={subname.name} /><ArrowRight size={18} aria-hidden="true" />
            </a> : <span className="subname-name"><NameSignature name={subname.name} /></span>}
            <Badge>{subname.status}</Badge>
            <span>{subnameExpiryDescription(subname.expiryPolicy)} · {formatLifecycleDay(subname.expiresAt, currentBlockHeight, nowSeconds)}</span>
            <div>Manager: <OwnerLabel authority={subname.manager} viewerAuthority={selectedAuthority} addresses={ownerAddresses} /></div>
          </div>
          {canControlSubname?.(subname) ? <SubnameAuthorityControls name={subname.name}
            onReassign={(owner, manager) => onReassignSubname?.(subname, owner, manager) ?? Promise.resolve()}
            onTakeBack={() => onTakeBackSubname?.(subname) ?? Promise.resolve()}
            onRemove={() => onRemoveSubname?.(subname) ?? Promise.resolve()} /> : null}
        </div>
      ))}
    </div>
  )
}
