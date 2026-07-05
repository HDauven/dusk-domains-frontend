import type { DuskDomainTxState } from '../../../names/internal'

export type ManagedNameState = {
  owner: string
  manager: string
  resolver: string
  expiresAt: number
  graceEndsAt: number
}

export type DomainSettingsViewProps = {
  canChangeRecordSource: boolean
  canManageName: boolean
  canRenewName: boolean
  confirmationInput: string
  currentBlockHeight: number | null
  displayName: string
  draftManager: string
  draftOwner: string
  draftResolver: string
  feeConfigError: string
  feeConfigLoading: boolean
  managedName: ManagedNameState
  managementError: string
  managementTxState: DuskDomainTxState | null
  maxDurationYears: number
  minDurationYears: number
  nowSeconds: number
  onBack: () => void
  onConfirmationInputChange: (value: string) => void
  onDraftManagerChange: (value: string) => void
  onDraftOwnerChange: (value: string) => void
  onDraftResolverChange: (value: string) => void
  onOwnershipUpdate: () => void
  onRenewName: () => void
  onRenewalYearsChange: (years: number) => void
  onResolverUpdate: () => void
  renewalBusy: boolean
  renewalError: string
  renewalFee: number
  renewalPreviewExpiresAt: number
  renewalTxState: DuskDomainTxState | null
  renewalYears: number
}

export type AuthoritySettingsPanelProps = Pick<
  DomainSettingsViewProps,
  | 'canChangeRecordSource'
  | 'canManageName'
  | 'confirmationInput'
  | 'displayName'
  | 'draftManager'
  | 'draftOwner'
  | 'draftResolver'
  | 'managedName'
  | 'managementError'
  | 'managementTxState'
  | 'onConfirmationInputChange'
  | 'onDraftManagerChange'
  | 'onDraftOwnerChange'
  | 'onDraftResolverChange'
  | 'onOwnershipUpdate'
  | 'onResolverUpdate'
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
