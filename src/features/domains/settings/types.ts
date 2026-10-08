import type { ResolvedRecipient } from '../../identity/resolveRecipient'
import type { DuskDomainTxState } from '../../../names/internal'

import type { ManagedNameState } from '../../../app/managedNameState'
export type { ManagedNameState } from '../../../app/managedNameState'

export type DomainSettingsViewProps = {
  websiteVerification?: Omit<import('./WebsiteVerificationPanel').WebsiteVerificationPanelProps, 'name' | 'owner'>
  isOwner?: boolean
  displayName: string
  managedName: ManagedNameState
  ownership: {
    canManageName: boolean
    confirmationInput: string
    managementError: string
    managementTxState: DuskDomainTxState | null
    onConfirmationInputChange: (value: string) => void
    viewerAuthority?: string
    ownerAddresses?: string[]
    onResolveRecipient?: (input: string) => Promise<ResolvedRecipient>
    onOwnershipUpdate: (change: { kind: 'transfer' | 'manager'; recipient: ResolvedRecipient; clearRecords?: boolean }) => Promise<boolean | undefined>
  }
  renewal: {
    canRenewName: boolean
    feeConfigError: string
    feeConfigLoading: boolean
    maxDurationYears: number
    minDurationYears: number
    onRenewName: () => void
    onRenewalYearsChange: (years: number) => void
    renewalBusy: boolean
    renewalError: string
    renewalFee: number
    renewalPreviewExpiresAt: number
    renewalTxState: DuskDomainTxState | null
    renewalYears: number
  }
  clock: {
    currentBlockHeight: number | null
    nowSeconds: number
  }
}

export type RecipientSettingsPanelProps = Pick<DomainSettingsViewProps, 'displayName' | 'managedName'> & {
  ownership: Pick<DomainSettingsViewProps['ownership'], 'canManageName' | 'confirmationInput' | 'managementError' | 'managementTxState' | 'onConfirmationInputChange' | 'onOwnershipUpdate' | 'viewerAuthority' | 'ownerAddresses' | 'onResolveRecipient'>
}

export type RenewalPanelProps = Pick<DomainSettingsViewProps, 'managedName'> & {
  renewal: Pick<DomainSettingsViewProps['renewal'], 'canRenewName' | 'feeConfigError' | 'feeConfigLoading' | 'maxDurationYears' | 'minDurationYears' | 'onRenewName' | 'onRenewalYearsChange' | 'renewalBusy' | 'renewalError' | 'renewalFee' | 'renewalPreviewExpiresAt' | 'renewalTxState' | 'renewalYears'>
  clock: Pick<DomainSettingsViewProps['clock'], 'currentBlockHeight' | 'nowSeconds'>
}

export type SubnameExpiryPanelProps = Pick<DomainSettingsViewProps, 'displayName' | 'managedName'> & {
  clock: Pick<DomainSettingsViewProps['clock'], 'currentBlockHeight' | 'nowSeconds'>
}
