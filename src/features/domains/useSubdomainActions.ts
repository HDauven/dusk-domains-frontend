import { writeSubnameAuthority, type NamespaceTarget } from './namespaceActions'
import { createSubdomain } from './createSubdomain'
import type { UseSubdomainActionsProps } from './subdomainActionTypes'

export function useSubdomainActions(props: UseSubdomainActionsProps) {
  async function handleCreateSubname() {
    await createSubdomain(props)
  }

  return { handleCreateSubname,
    handleReassignSubname: (subname: NamespaceTarget, owner: string, manager: string) => writeSubnameAuthority(props, subname, { owner, manager }),
    handleTakeBackSubname: (subname: NamespaceTarget) => writeSubnameAuthority(props, subname, 'take_back'),
    handleRemoveSubname: (subname: NamespaceTarget) => writeSubnameAuthority(props, subname),
  }
}
