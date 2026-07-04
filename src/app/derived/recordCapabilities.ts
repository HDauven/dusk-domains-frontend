import type { RecordTargetOption } from '../../features/domains/recordTypes'

export function deriveRecordCapabilities({
  activeRecordTarget,
  criticalRecordChange,
  criticalRecordConfirmationMatches,
  nodeHex,
  primaryBusy,
  primaryEndpoint,
  primaryEndpointErrors,
  primaryName,
  primaryVerified,
  publicRecordAcknowledged,
  recordBusy,
  recordDraftErrors,
  recordDraftMutations,
  renewalBusy,
  selectedAddress,
  subnameBusy,
  subnameLabel,
  subnameManager,
  walletAuthorized,
}: {
  activeRecordTarget: RecordTargetOption | undefined
  criticalRecordChange: boolean
  criticalRecordConfirmationMatches: boolean
  nodeHex: string
  primaryBusy: boolean
  primaryEndpoint: string
  primaryEndpointErrors: readonly string[]
  primaryName: string | null
  primaryVerified: boolean
  publicRecordAcknowledged: boolean
  recordBusy: boolean
  recordDraftErrors: readonly string[]
  recordDraftMutations: readonly unknown[]
  renewalBusy: boolean
  selectedAddress: string
  subnameBusy: boolean
  subnameLabel: string
  subnameManager: string
  walletAuthorized: boolean
}) {
  return {
    canClearPrimary: Boolean(walletAuthorized && selectedAddress && primaryName && primaryVerified && !primaryBusy),
    canCreateSubname: Boolean(walletAuthorized && selectedAddress && nodeHex && subnameLabel.trim() && subnameManager.trim() && !subnameBusy),
    canRenewName: Boolean(walletAuthorized && selectedAddress && nodeHex && !renewalBusy),
    canSaveRecords: Boolean(
      walletAuthorized
      && selectedAddress
      && activeRecordTarget
      && publicRecordAcknowledged
      && recordDraftMutations.length > 0
      && recordDraftErrors.length === 0
      && (!criticalRecordChange || criticalRecordConfirmationMatches)
      && !recordBusy,
    ),
    canSetPrimary: Boolean(walletAuthorized && selectedAddress && nodeHex && primaryEndpoint && primaryEndpointErrors.length === 0 && !primaryBusy),
  }
}
