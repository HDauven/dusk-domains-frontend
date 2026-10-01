import { NameSignature } from '../../../components/ui/NameChip'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import {
  subnameExpiryDescription,
} from '../../../names/internal'
import { ownerLabel } from '../../identity/ownerLabel'
import { formatLifecycleDay } from '../domainFormat'
import type { SubdomainListProps } from './types'

export function SubdomainList({
  selectedAuthority,
  currentBlockHeight,
  nowSeconds,
  onRecordTargetSelect,
  subnames,
}: SubdomainListProps) {
  return (
    <div className="subname-list">
      {subnames.map((subname) => (
        <Button
          className="subname-row"
          disabled={subname.status !== 'active'}
          key={subname.node}
          title={subname.status === 'active' ? `Open ${subname.name}` : undefined}
          type="button"
          onClick={() => onRecordTargetSelect(subname)}
        >
          <NameSignature name={subname.name} />
          <Badge>{subname.status}</Badge>
          <span>{subnameExpiryDescription(subname.expiryPolicy)} · {formatLifecycleDay(subname.expiresAt, currentBlockHeight, nowSeconds)}</span>
          <span>Manager: {ownerLabel(subname.manager, { viewerAuthority: selectedAuthority }).label}</span>
        </Button>
      ))}
    </div>
  )
}
