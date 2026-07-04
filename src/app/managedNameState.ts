import {
  createRegistrationLifecycle,
} from '../names/internal'

export const fallbackOwner = 'dusk1owner-preview'
export const fallbackManager = 'dusk1manager-preview'

export type ManagedNameState = {
  owner: string
  manager: string
  resolver: string
  expiresAt: number
  graceEndsAt: number
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
  }
}
