import { Button } from '../components/ui/Button'
import type { PendingOwnership } from './ownershipConfirmation'

export function OwnershipConfirmationNotice({ pending, onRetry }: {
  pending: PendingOwnership[]
  onRetry: (node: string) => void
}) {
  return pending.map(change => <div className="secure-note" key={change.node}>
    <p role="status">{change.name}: {change.message}</p>
    <Button disabled={change.checking} onClick={() => onRetry(change.node)}>Retry confirmation</Button>
  </div>)
}
