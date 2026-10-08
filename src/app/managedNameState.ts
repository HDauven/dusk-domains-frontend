import { sameAuthority } from '../features/identity/ownerLabel'
import {
  contractIdFromOutput,
  createRegistrationLifecycle,
  type SubnameExpiryPolicy,
} from '../names/internal'

export const fallbackOwner = 'dusk1owner-preview'
export const fallbackManager = 'dusk1manager-preview'

export type ManagedNameState = {
  websiteVerification?: import('../names/http/verification').BoundWebsiteVerification
  ancestors?: import('../names/internal').NamespaceAncestor[]
  node: string
  owner: string
  manager: string
  ownerIsContract?: boolean
  inMarketplaceEscrow?: boolean | null
  resolver: string
  expiresAt: number
  graceEndsAt: number
  // A subname's expiry policy; null for a root name, or when the indexer has not reported it.
  expiryPolicy: SubnameExpiryPolicy | null
}

export function createManagedNameState(resolver: string): ManagedNameState {
  const lifecycle = createRegistrationLifecycle({
    startsAt: 0,
    years: 1,
  })
  return {
    node: '',
    owner: fallbackOwner,
    manager: fallbackManager,
    resolver,
    expiresAt: lifecycle.expiresAt,
    graceEndsAt: lifecycle.graceEndsAt,
    expiryPolicy: null,
  }
}

export function isMarketplaceEscrow(name: Pick<ManagedNameState, 'owner' | 'manager'>, marketplaceContractId: string | null) {
  try {
    const id = contractIdFromOutput(marketplaceContractId?.trim())
    if (!id) return null
    return [name.owner, name.manager].some(authority => sameAuthority(authority, id))
  } catch { return null }
}

export function canRenewOutsideEscrow(name: Pick<ManagedNameState, 'ownerIsContract' | 'inMarketplaceEscrow'>) {
  return !name.inMarketplaceEscrow && (!name.ownerIsContract || name.inMarketplaceEscrow === false)
}
