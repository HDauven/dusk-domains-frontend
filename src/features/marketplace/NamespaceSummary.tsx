import type { NamespaceSummary as Summary } from '../../names/internal'

export function NamespaceSummary({ namespace }: { namespace?: Summary }) {
  if (!namespace?.descendantCount) return null
  return <p className="field-note">Includes {namespace.descendantCount} subnames · {namespace.heldByOthersCount} held by others</p>
}
