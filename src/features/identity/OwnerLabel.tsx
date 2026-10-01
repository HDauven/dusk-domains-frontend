import { AddressChip } from '../../components/ui/AddressChip'
import { ownerLabel } from './ownerLabel'

export function OwnerLabel({ authority, viewerAuthority, addresses }: {
  authority: string
  viewerAuthority?: string
  addresses?: readonly (string | null | undefined)[]
}) {
  const owner = ownerLabel(authority, { viewerAuthority, addresses })
  if (owner.kind === 'you') return <span>You</span>
  if (owner.kind === 'address') return <AddressChip value={owner.value} label="Dusk address" />
  return <details className="owner-identity"><summary>{owner.label}</summary><p>This is a registry account ID. No matching Dusk address is available.</p><code>{owner.value}</code></details>
}
