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
  /** Dusk addresses read from the names above it, to show their holders by address. */
  ancestorAddresses?: string[]
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

/**
 * Whether a market holds the name. Any market this site knows counts: the preferred one, and those
 * its manifest lists, such as a draining market whose listings can still be settled or returned.
 * Null when no market is known.
 */
export function isMarketplaceEscrow(name: Pick<ManagedNameState, 'owner' | 'manager'>, marketplaces: string | readonly string[] | null) {
  try {
    const ids = (typeof marketplaces === 'string' ? [marketplaces] : marketplaces ?? [])
      .map(id => contractIdFromOutput(id?.trim())).filter((id): id is string => Boolean(id))
    if (!ids.length) return null
    return ids.some(id => [name.owner, name.manager].some(authority => sameAuthority(authority, id)))
  } catch { return null }
}
