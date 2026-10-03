import { subnameExpiryCopy } from '../domainFormat'
import type { SubnameExpiryPanelProps } from './types'

// A subname is never renewed on its own, so it gets a note on its expiry instead of renewal controls.
export function SubnameExpiryPanel({ displayName, managedName, clock }: SubnameExpiryPanelProps) {
  const {
    currentBlockHeight,
    nowSeconds,
  } = clock
  return (
    <div className="renewal-box" aria-label="Expiry">
      <div>
        <h3>Expiry</h3>
        <p>{subnameExpiryCopy(displayName, managedName.expiresAt, managedName.expiryPolicy, currentBlockHeight, nowSeconds)}</p>
      </div>
    </div>
  )
}
