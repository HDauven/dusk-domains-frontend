import type { NameStatus } from '../../names/internal'
import { isSubname } from '../domains/domainFormat'
import { sameAuthority } from '../identity/ownerLabel'

export function namePageAccess(owner: string, manager: string, viewer: string) {
  const isOwner = sameAuthority(owner, viewer)
  return { isOwner, canEdit: isOwner || sameAuthority(manager, viewer) }
}

export function nameSections(canEdit: boolean, hasSubnames: boolean, canPayRenewal = false) {
  return [
    { id: 'details' as const, label: 'Profile' },
    ...(canEdit ? [{ id: 'records' as const, label: 'Records' }] : []),
    ...(canEdit || hasSubnames ? [{ id: 'subnames' as const, label: 'Subnames' }] : []),
    ...(canEdit || canPayRenewal ? [{ id: 'manage' as const, label: canEdit ? 'Settings' : 'Renew' }] : []),
    { id: 'activity' as const, label: 'Activity' },
  ]
}

/** Anyone but the owner can offer on a live second-level name that a wallet holds, listed for
 * sale or not. A name in marketplace escrow is bought through its listing instead. */
export function canOfferOn({ name, status, owner, ownerIsContract, expiresAt, currentBlockHeight, viewer }: {
  name: string
  status: NameStatus
  owner: string | null
  ownerIsContract?: boolean
  expiresAt: number
  currentBlockHeight: number | null
  viewer: string
}) {
  return status === 'registered' && !isSubname(name) && Boolean(owner) && !sameAuthority(owner, viewer) && !ownerIsContract
    && (currentBlockHeight === null || currentBlockHeight < expiresAt)
}
