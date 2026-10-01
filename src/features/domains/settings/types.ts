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
  draftManager: string
  draftOwner: string
  feeConfigError: string
  feeConfigLoading: boolean
  managedName: ManagedNameState
  managementError: string
  managementTxState: DuskDomainTxState | null
  maxDurationYears: number
  minDurationYears: number
  nowSeconds: number
  onConfirmationInputChange: (value: string) => void
  onDraftManagerChange: (value: string) => void
  onDraftOwnerChange: (value: string) => void
  onOwnershipUpdate: () => void
  onRenewName: () => void
  onRenewalYearsChange: (years: number) => void
  renewalBusy: boolean
  renewalError: string
  renewalFee: number
  renewalPreviewExpiresAt: number
  renewalTxState: DuskDomainTxState | null
  renewalYears: number
}

export type AuthoritySettingsPanelProps = Pick<
  DomainSettingsViewProps,
  | 'canManageName'
  | 'confirmationInput'
  | 'displayName'
  | 'draftManager'
  | 'draftOwner'
  | 'managedName'
  | 'managementError'
  | 'managementTxState'
  | 'onConfirmationInputChange'
  | 'onDraftManagerChange'
  | 'onDraftOwnerChange'
  | 'onOwnershipUpdate'
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
