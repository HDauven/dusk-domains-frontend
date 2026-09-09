import type { ManagedNameState } from '../appHelpers'

export function canManageActiveName(
  name: Pick<ManagedNameState, 'owner' | 'manager' | 'expiresAt'> | undefined,
  authority: string,
  height: number | null,
) {
  return Boolean(name && authority && height !== null && height < name.expiresAt
    && [name.owner, name.manager].some(value => value.toLowerCase() === authority.toLowerCase()))
}

export function deriveManagementCapabilities({
  confirmationInput,
  displayName,
  managedName,
  managementBusy,
  nodeHex,
  selectedAddress,
  selectedAuthority,
  walletAuthorized,
}: {
  confirmationInput: string
  displayName: string
  managedName: ManagedNameState
  managementBusy: boolean
  nodeHex: string
  selectedAddress: string
  selectedAuthority: string
  walletAuthorized: boolean
}) {
  const connectedAsNameOwner = Boolean(
    selectedAuthority &&
    managedName.owner &&
    selectedAuthority.toLowerCase() === managedName.owner.toLowerCase(),
  )
  const managementConfirmationMatches = confirmationInput.trim().toLowerCase() === displayName.toLowerCase()

  return {
    canManageName: Boolean(
      walletAuthorized &&
      selectedAddress &&
      nodeHex &&
      connectedAsNameOwner &&
      managementConfirmationMatches &&
      !managementBusy,
    ),
    connectedAsNameOwner,
    managementConfirmationMatches,
  }
}
