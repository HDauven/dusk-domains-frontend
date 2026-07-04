import type { ManagedNameState } from '../appHelpers'

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
