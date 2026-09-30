import {
  createRegistrationLifecycle,
  type SubnameExpiryPolicy,
} from '../names/internal'

export const fallbackOwner = 'dusk1owner-preview'
export const fallbackManager = 'dusk1manager-preview'

export type ManagedNameState = {
  owner: string
  manager: string
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
    owner: fallbackOwner,
    manager: fallbackManager,
    resolver,
    expiresAt: lifecycle.expiresAt,
    graceEndsAt: lifecycle.graceEndsAt,
    expiryPolicy: null,
  }
}
