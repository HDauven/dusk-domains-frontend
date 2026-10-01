import { sameAuthority } from '../identity/ownerLabel'

export function namePageAccess(owner: string, manager: string, viewer: string) {
  const isOwner = sameAuthority(owner, viewer)
  return { isOwner, canEdit: isOwner || sameAuthority(manager, viewer) }
}

export function nameSections(canEdit: boolean, hasSubnames: boolean) {
  return [
    { id: 'details' as const, label: 'Profile' },
    ...(canEdit ? [{ id: 'records' as const, label: 'Records' }] : []),
    ...(canEdit || hasSubnames ? [{ id: 'subnames' as const, label: 'Subnames' }] : []),
    ...(canEdit ? [{ id: 'manage' as const, label: 'Settings' }] : []),
    { id: 'activity' as const, label: 'Activity' },
  ]
}
