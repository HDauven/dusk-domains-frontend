import type { Dispatch, SetStateAction } from 'react'
import type { ManagedNameState } from '../../app/appHelpers'
import type {
  ActivityEntry,
  CoreFeeConfig,
  CoreRecordMutationInput,
  DuskDomainsRuntimeConfig,
  DuskDomainTxState,
  PrimaryNameDisplayStatus,
  ResolverRecord,
  ResolverRecordKey,
  SubnameExpiryPolicy,
  SubnameRevocationPolicy,
  SubnameState,
} from '../../names/internal'
import type { SearchResultPanelProps } from '../search/SearchResultPanel'
import type { WalletConnectionStatus } from '../wallet/walletStatus'
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

type SubmitNameWrite = PrimaryActionsProps['submitNameWrite']
type ConfirmedWriteFallback = PrimaryActionsProps['shouldApplyPreviewWriteFallback']
type EnsureContractAuthorityForLiveWrite = PrimaryActionsProps['ensureContractAuthorityForLiveWrite']
type EnsurePublicBalanceForLiveWrite = PrimaryActionsProps['ensurePublicBalanceForLiveWrite']

type AppendActivity = (input: {
  eventType: ActivityEntry['eventType']
  actor: string
  target?: string
  txId?: string
  node?: string
  name?: string
}) => void

export type UseDomainManagementFeatureProps = {
  activeRecordTarget: RecordTargetOption | undefined
  appendActivity: AppendActivity
  canChangeRecordSource: boolean
  canClearPrimary: boolean
  canCreateSubname: boolean
  canDelegateSubname: boolean
  canManageName: boolean
  canRemoveRecords: boolean
  canRenewName: boolean
  canRevokeSelectedSubname: boolean
  canSaveRecords: boolean
  canSetPrimary: boolean
  clampDurationYears: (years: number) => number
  confirmationInput: string
  criticalRecordChange: boolean
  criticalRecordConfirmation: string
  currentBlockHeight: number | null
  delegateManager: string
  delegateSubnameNode: string
  displayName: string
  draftManager: string
  draftOwner: string
  draftResolver: string
  editableRecordKeys: readonly ResolverRecordKey[]
  fallbackManager: string
  feeConfig: CoreFeeConfig
  feeConfigError: string
  feeConfigLoading: boolean
  lifecycleBaseBlockHeight: number
  managedName: ManagedNameState
  managementError: string
  managementTxState: DuskDomainTxState | null
  maxDurationYears: number
  minDurationYears: number
  moonlightRecord: ResolverRecord | undefined
  nodeHex: string
  nowSeconds: number
  onBackToDetails: () => void
  primaryEndpoint: string
  primaryEndpointValue: string
  primaryError: string
  primaryTxState: DuskDomainTxState | null
  primaryVerification: PrimaryNameDisplayStatus
  publicRecordAcknowledged: boolean
  recordBusy: boolean
  recordDraftErrors: string[]
  recordDraftMutations: CoreRecordMutationInput[]
  recordDraftValues: Partial<Record<ResolverRecordKey, string>>
  recordError: string
  recordTargetOptions: RecordTargetOption[]
  recordTxState: DuskDomainTxState | null
  renewalBusy: boolean
  renewalError: string
  renewalFee: number
  renewalPreviewExpiresAt: number
  renewalTxState: DuskDomainTxState | null
  renewalYears: number
  resolverRecords: ResolverRecord[]
  resultLabel: string
  runtimeConfig: DuskDomainsRuntimeConfig
  requestSelectedShieldedAddress: () => Promise<string>
  selectedAddress: string
  selectedAuthority: string
  selectedDelegatedSubname: SubnameState | undefined
  setConfirmationInput: SetState<string>
  setCriticalRecordConfirmation: SetState<string>
  setDelegateManager: SetState<string>
  setDelegateSubnameNode: SetState<string>
  setDraftManager: SetState<string>
  setDraftOwner: SetState<string>
  setDraftResolver: SetState<string>
  setManagedName: SetState<ManagedNameState>
  setManagementError: SetState<string>
  setManagementTxState: SetState<DuskDomainTxState | null>
  setPrimaryEndpointValue: SetState<string>
  setPrimaryError: SetState<string>
  setPrimaryName: SetState<string | null>
  setPrimaryTxState: SetState<DuskDomainTxState | null>
  setPublicRecordAcknowledged: SetState<boolean>
  setRecordDrafts: SetState<Record<string, string>>
  setRecordError: SetState<string>
  setRecordTargetNode: SetState<string>
  setRecordTxState: SetState<DuskDomainTxState | null>
  setRenewalError: SetState<string>
  setRenewalTxState: SetState<DuskDomainTxState | null>
  setRenewalYears: SetState<number>
  setResolverRecordSets: SetState<Record<string, ResolverRecord[]>>
  setSubnameError: SetState<string>
  setSubnameExpiryDate: SetState<string>
  setSubnameExpiryPolicy: SetState<SubnameExpiryPolicy>
  setSubnameLabel: SetState<string>
  setSubnameManager: SetState<string>
  setSubnameResolver: SetState<string>
  setSubnameRevocationPolicy: SetState<SubnameRevocationPolicy>
  setSubnames: SetState<SubnameState[]>
  setSubnameTxState: SetState<DuskDomainTxState | null>
  shouldApplyPreviewWriteFallback: ConfirmedWriteFallback
  submitNameWrite: SubmitNameWrite
  subnameError: string
  subnameExpiryDate: string
  subnameExpiryPolicy: SubnameExpiryPolicy
  subnameLabel: string
  subnameManager: string
  subnameResolver: string
  subnameRevocationPolicy: SubnameRevocationPolicy
  subnames: SubnameState[]
  subnameTxState: DuskDomainTxState | null
  walletAuthorized: boolean
  walletSetupState: WalletConnectionStatus
  ensureContractAuthorityForLiveWrite: EnsureContractAuthorityForLiveWrite
  ensurePublicBalanceForLiveWrite: EnsurePublicBalanceForLiveWrite
}

export type DomainManagementFeatureProps = Pick<
  SearchResultPanelProps,
  'primaryProps' | 'recordsProps' | 'settingsProps' | 'subdomainsProps'
>
