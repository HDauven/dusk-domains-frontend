import { NameSignature } from '../../../components/ui/NameChip'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import {
  subnameExpiryDescription,
} from '../../../names/internal'
import { abbreviate } from '../../../utils/format'
import { formatLifecycleDay } from '../domainFormat'
import type { SubdomainListProps } from './types'

export function SubdomainList({
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
          title={subname.status === 'active' ? `Edit records for ${subname.name}` : undefined}
          type="button"
          onClick={() => onRecordTargetSelect(subname)}
        >
          <NameSignature name={subname.name} />
          <Badge>{subname.status}</Badge>
          <span>{subnameExpiryDescription(subname.expiryPolicy)} · {formatLifecycleDay(subname.expiresAt, currentBlockHeight, nowSeconds)}</span>
          <code>{abbreviate(subname.manager)}</code>
        </Button>
      ))}
    </div>
  )
}
