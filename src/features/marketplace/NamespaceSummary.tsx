import type { NamespaceSummary as Summary } from '../../names/internal'

export function NamespaceSummary({ namespace }: { namespace?: Summary }) {
  if (!namespace?.descendantCount) return null
  return <p className="field-note">Includes {namespace.descendantCount} subnames · {namespace.heldByOthersCount} held by others</p>
}

export function NamespaceTransferWarning({ namespace }: { namespace?: Summary }) {
  return <div className="marketplace-namespace-warning">
    <NamespaceSummary namespace={namespace} />
    <p className="field-note">The buyer controls the whole namespace, including subnames held by others, and can take back any subname. Subnames themselves can’t be sold.</p>
  </div>
}
