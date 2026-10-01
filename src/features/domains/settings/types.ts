import type { ResolvedRecipient } from '../../identity/resolveRecipient'
import type { DuskDomainTxState } from '../../../names/internal'

import type { ManagedNameState } from '../../../app/managedNameState'
export type { ManagedNameState } from '../../../app/managedNameState'

export type DomainSettingsViewProps = {
  isOwner?: boolean
  canManageName: boolean
  canRenewName: boolean
  confirmationInput: string
  currentBlockHeight: number | null
  displayName: string
  feeConfigError: string
  feeConfigLoading: boolean
  managedName: ManagedNameState
  managementError: string
  managementTxState: DuskDomainTxState | null
  maxDurationYears: number
  minDurationYears: number
  nowSeconds: number
  onConfirmationInputChange: (value: string) => void
  viewerAuthority?: string
  ownerAddresses?: string[]
  onResolveRecipient?: (input: string) => Promise<ResolvedRecipient>
  onOwnershipUpdate: (change: { kind: 'transfer' | 'manager'; recipient: ResolvedRecipient; clearRecords?: boolean }) => Promise<boolean | undefined>
  onRenewName: () => void
  onRenewalYearsChange: (years: number) => void
  renewalBusy: boolean
  renewalError: string
  renewalFee: number
  renewalPreviewExpiresAt: number
  renewalTxState: DuskDomainTxState | null
  renewalYears: number
}

export type RecipientSettingsPanelProps = Pick<
  DomainSettingsViewProps,
  | 'canManageName'
  | 'confirmationInput'
  | 'displayName'
  | 'managedName'
  | 'managementError'
  | 'managementTxState'
  | 'onConfirmationInputChange'
  | 'onOwnershipUpdate'
  | 'viewerAuthority'
  | 'ownerAddresses'
  | 'onResolveRecipient'
>

export type RenewalPanelProps = Pick<
  DomainSettingsViewProps,
  | 'canRenewName'
  | 'currentBlockHeight'
  | 'feeConfigError'
  | 'feeConfigLoading'
  | 'managedName'
  | 'maxDurationYears'
  | 'minDurationYears'
  | 'nowSeconds'
  | 'onRenewName'
  | 'onRenewalYearsChange'
  | 'renewalBusy'
  | 'renewalError'
  | 'renewalFee'
  | 'renewalPreviewExpiresAt'
  | 'renewalTxState'
  | 'renewalYears'
>

export type SubnameExpiryPanelProps = Pick<
  DomainSettingsViewProps,
  | 'currentBlockHeight'
  | 'displayName'
  | 'managedName'
  | 'nowSeconds'
>
