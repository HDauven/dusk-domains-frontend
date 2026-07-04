import {
  subnameExpiryDescription,
  subnameRevocationDescription,
} from '../../../names/internal'
import { abbreviate } from '../../../utils/format'
import { formatLifecycleDay } from '../domainFormat'
import type { SubdomainListProps } from './types'

export function SubdomainList({
  currentBlockHeight,
  delegateSubnameNode,
  nowSeconds,
  onDelegateManagerChange,
  onDelegateSubnameChange,
  onRecordTargetSelect,
  subnames,
}: SubdomainListProps) {
  return (
    <div className="subname-list">
      {subnames.map((subname) => (
        <button
          className={delegateSubnameNode === subname.node ? 'subname-row selected' : 'subname-row'}
          key={subname.node}
          type="button"
          onClick={() => {
            onDelegateSubnameChange(subname.node)
            onDelegateManagerChange(subname.manager)
            if (subname.status === 'active') {
              onRecordTargetSelect(subname)
            }
          }}
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
