import { createSubdomain } from './createSubdomain'
import { delegateSubdomain } from './delegateSubdomain'
import { revokeSubdomain } from './revokeSubdomain'
import type { UseSubdomainActionsProps } from './subdomainActionTypes'

export function useSubdomainActions(props: UseSubdomainActionsProps) {
  async function handleCreateSubname() {
    await createSubdomain(props)
  }

  async function handleDelegateSubname() {
    await delegateSubdomain(props)
  }

  async function handleRevokeSubname() {
    await revokeSubdomain(props)
  }

  return {
    handleCreateSubname,
    handleDelegateSubname,
    handleRevokeSubname,
  }
}
