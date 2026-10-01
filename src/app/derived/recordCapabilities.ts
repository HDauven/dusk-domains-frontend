import { isSubname, lifecycleHeightReached, renewalDeadline } from '../../features/domains/domainFormat'
import type { ManagedNameState } from '../appHelpers'
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
  primaryName,
  primaryVerified,
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
  managedName: Pick<ManagedNameState, 'owner' | 'manager' | 'expiresAt' | 'graceEndsAt'>
  nodeHex: string
  nowSeconds: number
  primaryBusy: boolean
  primaryEndpoint: string
  primaryEndpointErrors: readonly string[]
  primaryName: string | null
  primaryVerified: boolean
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
    canClearPrimary: Boolean(walletAuthorized && selectedAddress && primaryName && primaryVerified && !primaryBusy),
    canCreateSubname: Boolean(walletAuthorized && selectedAddress && nodeHex && subnameLabel.trim() && !subnameBusy),
    // Owners and managers can renew root names until grace ends.
    canRenewName: Boolean(
      walletAuthorized
      && selectedAddress
      && nodeHex
      && !isSubname(displayName)
      && selectedAuthority
      && [managedName.owner, managedName.manager].some(value => value.toLowerCase() === selectedAuthority.toLowerCase())
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
