import {
  subnameExpiryDescription,
  subnameRevocationDescription,
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
        <button
          className="subname-row"
          disabled={subname.status !== 'active'}
          key={subname.node}
          title={subname.status === 'active' ? `Edit records for ${subname.name}` : undefined}
          type="button"
          onClick={() => onRecordTargetSelect(subname)}
        >
          <strong>{subname.name}</strong>
          <span>{subname.status}</span>
          <span>{subnameExpiryDescription(subname.expiryPolicy)} · {formatLifecycleDay(subname.expiresAt, currentBlockHeight, nowSeconds)}</span>
          <span>{subnameRevocationDescription(subname.revocationPolicy)}</span>
          <code>{abbreviate(subname.manager)}</code>
        </button>
      ))}
    </div>
  )
}
