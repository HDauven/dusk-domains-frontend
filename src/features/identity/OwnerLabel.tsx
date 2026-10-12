import { AddressChip } from '../../components/ui/AddressChip'
import { ownerLabel } from './ownerLabel'

export function OwnerLabel({ authority, viewerAuthority, addresses, compact = false }: {
  compact?: boolean
  authority: string
  viewerAuthority?: string
  addresses?: readonly (string | null | undefined)[]
}) {
  const owner = ownerLabel(authority, { viewerAuthority, addresses })
  if (owner.kind === 'you') return <span>You</span>
  if (compact && owner.kind === 'address') return <span title={owner.value}>{owner.label}</span>
  if (owner.kind === 'address') return <AddressChip value={owner.value} label="Dusk address" />
  return <details className="owner-identity"><summary>{owner.label}</summary><p>The registry stores an ID made from each account's Dusk address, or a contract's own ID. No address seen on this page matches this one yet.</p><code>{owner.value}</code></details>
}
