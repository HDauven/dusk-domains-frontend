import { subnameExpiryCopy } from '../domainFormat'
import type { SubnameExpiryPanelProps } from './types'

// A subname is never renewed on its own, so it gets a note on its expiry instead of renewal controls.
export function SubnameExpiryPanel({
  currentBlockHeight,
  displayName,
  managedName,
  nowSeconds,
}: SubnameExpiryPanelProps) {
  return (
    <div className="renewal-box" aria-label="Expiry">
      <div>
        <h3>Expiry</h3>
        <p>{subnameExpiryCopy(displayName, managedName.expiresAt, managedName.expiryPolicy, currentBlockHeight, nowSeconds)}</p>
      </div>
    </div>
  )
}
