import { SubnameAuthorityControls } from './SubnameAuthorityControls'
import { NameSignature } from '../../../components/ui/NameChip'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import {
  subnameExpiryDescription,
} from '../../../names/internal'
import { OwnerLabel } from '../../identity/OwnerLabel'
import { formatLifecycleDay } from '../domainFormat'
import type { SubdomainListProps } from './types'

export function SubdomainList({
  ownerAddresses,
  canControlSubname,
  onReassignSubname,
  onRemoveSubname,
  onTakeBackSubname,
  selectedAuthority,
  currentBlockHeight,
  nowSeconds,
  onRecordTargetSelect,
  subnames,
}: SubdomainListProps) {
  return (
    <div className="subname-list">
      {subnames.map((subname) => (
        <div className="subname-row" key={subname.node}>
        <Button variant="quiet"
          disabled={subname.status !== 'active'}
          title={subname.status === 'active' ? `Open ${subname.name}` : undefined}
          type="button"
          onClick={() => onRecordTargetSelect(subname)}
        >
          <NameSignature name={subname.name} />
        </Button>
          <Badge>{subname.status}</Badge>
          <span>{subnameExpiryDescription(subname.expiryPolicy)} · {formatLifecycleDay(subname.expiresAt, currentBlockHeight, nowSeconds)}</span>
          <div>Manager: <OwnerLabel authority={subname.manager} viewerAuthority={selectedAuthority} addresses={ownerAddresses} /></div>
          {canControlSubname?.(subname) ? <SubnameAuthorityControls name={subname.name}
            onReassign={(owner, manager) => onReassignSubname?.(subname, owner, manager) ?? Promise.resolve()}
            onTakeBack={() => onTakeBackSubname?.(subname) ?? Promise.resolve()}
            onRemove={() => onRemoveSubname?.(subname) ?? Promise.resolve()} /> : null}
        </div>
      ))}
    </div>
  )
}
