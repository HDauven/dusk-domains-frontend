import type { Dispatch, SetStateAction } from 'react'
import type {
  ActivityEntry,
  DuskDomainTxState,
  PrimaryNameDisplayStatus,
  ResolverRecord,
  ResolverRecordKey,
  SubnameExpiryPolicy,
  SubnameRevocationPolicy,
  SubnameState,
} from '../../names/internal'
import type { SearchResultPanelProps } from '../search/SearchResultPanel'
import type { RecordTargetOption } from './recordTypes'
import type { useDomainRecordActions } from './useDomainRecordActions'
import type { useDomainSettingsActions } from './useDomainSettingsActions'
import type { usePrimaryDomainActions } from './usePrimaryDomainActions'
import type { useSubdomainActions } from './useSubdomainActions'

type SetState<T> = Dispatch<SetStateAction<T>>

export type PrimaryActionsProps = Parameters<typeof usePrimaryDomainActions>[0]
export type RecordActionsProps = Parameters<typeof useDomainRecordActions>[0]
export type SettingsActionsProps = Parameters<typeof useDomainSettingsActions>[0]
export type SubdomainActionsProps = Parameters<typeof useSubdomainActions>[0]

export type UseDomainManagementFeatureProps =
  & PrimaryActionsProps
  & RecordActionsProps
  & SettingsActionsProps
  & Omit<SubdomainActionsProps, 'managedNameExpiresAt'>
  & {
    appendActivity: (input: {
      eventType: ActivityEntry['eventType']
      actor: string
      target?: string
      txId?: string
      node?: string
      name?: string
    }) => void
    canChangeRecordSource: boolean
    canRemoveRecords: boolean
    clampDurationYears: (years: number) => number
    confirmationInput: string
    criticalRecordConfirmation: string
    delegateSubnameNode: string
    draftResolver: string
    editableRecordKeys: readonly ResolverRecordKey[]
    fallbackManager: string
    feeConfigError: string
    feeConfigLoading: boolean
    managementError: string
    managementTxState: DuskDomainTxState | null
    maxDurationYears: number
    minDurationYears: number
    moonlightRecord: ResolverRecord | undefined
    onBackToDetails: () => void
    primaryEndpointValue: string
    primaryError: string
    primaryTxState: DuskDomainTxState | null
    primaryVerification: PrimaryNameDisplayStatus
    publicRecordAcknowledged: boolean
    recordDraftValues: Partial<Record<ResolverRecordKey, string>>
    recordError: string
    recordTargetOptions: RecordTargetOption[]
    recordTxState: DuskDomainTxState | null
    renewalBusy: boolean
    renewalError: string
    renewalFee: number
    renewalPreviewExpiresAt: number
    renewalTxState: DuskDomainTxState | null
    resolverRecords: ResolverRecord[]
    requestSelectedShieldedAddress: () => Promise<string>
    setConfirmationInput: SetState<string>
    setDraftResolver: SetState<string>
    setRenewalYears: SetState<number>
    setSubnameExpiryDate: SetState<string>
    setSubnameExpiryPolicy: SetState<SubnameExpiryPolicy>
    setSubnameLabel: SetState<string>
    setSubnameManager: SetState<string>
    setSubnameResolver: SetState<string>
    setSubnameRevocationPolicy: SetState<SubnameRevocationPolicy>
    subnameError: string
    subnames: SubnameState[]
    subnameTxState: DuskDomainTxState | null
  }

export type DomainManagementFeatureProps = Pick<
  SearchResultPanelProps,
  'primaryProps' | 'recordsProps' | 'settingsProps' | 'subdomainsProps'
>
