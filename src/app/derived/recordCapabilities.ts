import { isSubname, lifecycleHeightReached, renewalDeadline } from '../../features/domains/domainFormat'
import { canRenewOutsideEscrow, type ManagedNameState } from '../managedNameState'
import type { RecordTargetOption } from '../../features/domains/recordTypes'

export function deriveRecordCapabilities({
  activeRecordTarget,
  currentBlockHeight,
  displayName,
  managedName,
  nodeHex,
  nowSeconds,
  primaryBusy,
  primaryEndpoint,
  primaryEndpointErrors,
  connectedPrimaryName,
  recordBusy,
  recordDraftErrors,
  recordDraftMutations,
  renewalBusy,
  selectedAddress,
  selectedAuthority,
  subnameBusy,
  subnameLabel,
  walletAuthorized,
}: {
  activeRecordTarget: RecordTargetOption | undefined
  currentBlockHeight: number | null
  displayName: string
  managedName: Pick<ManagedNameState, 'owner' | 'manager' | 'ownerIsContract' | 'inMarketplaceEscrow' | 'expiresAt' | 'graceEndsAt'>
  nodeHex: string
  nowSeconds: number
  primaryBusy: boolean
  primaryEndpoint: string
  primaryEndpointErrors: readonly string[]
  connectedPrimaryName: string | null
  recordBusy: boolean
  recordDraftErrors: readonly string[]
  recordDraftMutations: readonly unknown[]
  renewalBusy: boolean
  selectedAddress: string
  selectedAuthority: string
  subnameBusy: boolean
  subnameLabel: string
  subnameManager: string
  walletAuthorized: boolean
}) {
  return {
    canClearPrimary: Boolean(walletAuthorized && selectedAddress && primaryEndpoint === selectedAddress && connectedPrimaryName && connectedPrimaryName === displayName && !primaryBusy),
    canCreateSubname: Boolean(walletAuthorized && selectedAddress && nodeHex && subnameLabel.trim() && !subnameBusy),
    // Marketplace escrow must close before any payer can renew.
    canRenewName: Boolean(
      walletAuthorized
      && selectedAddress
      && nodeHex
      && !isSubname(displayName)
      && canRenewOutsideEscrow(managedName)
      && selectedAuthority
      && (managedName.ownerIsContract || [managedName.owner, managedName.manager].some(value => value.toLowerCase() === selectedAuthority.toLowerCase()))
      && managedName.expiresAt > 0
      && !lifecycleHeightReached(renewalDeadline(managedName), currentBlockHeight, nowSeconds)
      && !renewalBusy,
    ),
    canSaveRecords: Boolean(
      walletAuthorized
      && selectedAddress
      && activeRecordTarget
      && recordDraftMutations.length > 0
      && recordDraftErrors.length === 0
      && !recordBusy,
    ),
    canSetPrimary: Boolean(walletAuthorized && selectedAddress && nodeHex && primaryEndpoint && primaryEndpointErrors.length === 0 && !primaryBusy),
  }
}
