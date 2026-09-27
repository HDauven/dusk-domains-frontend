import type { Dispatch, SetStateAction } from 'react'
import type { SubmitNameWrite } from '../../app/useDuskDomainWriter'
import type { ConfirmedWriteFallback } from '../../app/useIndexerWriteFallback'
import type { LiveWritePreflight } from '../../app/useLiveWritePreflight'
import type {
  CoreRecordMutationInput,
  DuskDomainsRuntimeConfig,
  DuskDomainTxState,
  ResolverRecord,
} from '../../names/internal'
import type { WalletConnectionStatus } from '../wallet/walletStatus'
import type { RecordTargetOption } from './recordTypes'

export type { SubmitNameWrite, ConfirmedWriteFallback }

export type AppendDomainRecordActivity = (input: {
  eventType: 'record_update'
  actor: string
  target?: string
  txId?: string
  node?: string
  name?: string
}) => void

export type UseDomainRecordActionsProps = {
  activeRecordTarget: RecordTargetOption | undefined
  appendActivity: AppendDomainRecordActivity
  canRemoveRecords: boolean
  canSaveRecords: boolean
  criticalRecordChange: boolean
  nodeHex: string
  recordBusy: boolean
  recordDraftErrors: string[]
  recordDraftMutations: CoreRecordMutationInput[]
  runtimeConfig: DuskDomainsRuntimeConfig
  selectedAddress: string
  selectedAuthority: string
  setCriticalRecordConfirmation: Dispatch<SetStateAction<string>>
  setPrimaryEndpointValue: Dispatch<SetStateAction<string>>
  setPublicRecordAcknowledged: Dispatch<SetStateAction<boolean>>
  setRecordDrafts: Dispatch<SetStateAction<Record<string, string>>>
  setRecordError: Dispatch<SetStateAction<string>>
  setRecordTxState: Dispatch<SetStateAction<DuskDomainTxState | null>>
  setResolverRecordSets: Dispatch<SetStateAction<Record<string, ResolverRecord[]>>>
  shouldApplyPreviewWriteFallback: ConfirmedWriteFallback
  submitNameWrite: SubmitNameWrite
  walletAuthorized: boolean
  walletSetupState: WalletConnectionStatus
} & LiveWritePreflight
