import { createSubdomain } from './createSubdomain'
import type { UseSubdomainActionsProps } from './subdomainActionTypes'

export function useSubdomainActions(props: UseSubdomainActionsProps) {
  async function handleCreateSubname() {
    await createSubdomain(props)
  }

  return { handleCreateSubname }
}
