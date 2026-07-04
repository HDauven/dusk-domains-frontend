import type { Dispatch, SetStateAction } from 'react'
import type {
  CoreRecordMutationInput,
  DuskNameCallMetadata,
  DuskNamesIndexerClient,
  DuskNamesRuntimeConfig,
  DuskNameTxState,
  ResolverRecord,
  SubmitDuskNameWriteOptions,
} from '../../names/internal'
import type { WalletConnectionStatus } from '../wallet/walletStatus'
import type { RecordTargetOption } from './recordTypes'

export type SubmitNameWrite = (
  name: string,
  call: DuskNameCallMetadata,
  options?: SubmitDuskNameWriteOptions,
) => Promise<DuskNameTxState>

export type AppendDomainRecordActivity = (input: {
  eventType: 'record_update'
  actor: string
  target?: string
  txId?: string
  node?: string
  name?: string
}) => void

export type ConfirmedWriteFallback = (
  description: string,
  check?: (client: DuskNamesIndexerClient) => Promise<boolean>,
) => Promise<boolean>

export type UseDomainRecordActionsProps = {
  activeRecordTarget: RecordTargetOption | undefined
  appendActivity: AppendDomainRecordActivity
  canSaveRecords: boolean
  criticalRecordChange: boolean
  nodeHex: string
  recordBusy: boolean
  recordDraftErrors: string[]
  recordDraftMutations: CoreRecordMutationInput[]
  runtimeConfig: DuskNamesRuntimeConfig
  selectedAddress: string
  selectedAuthority: string
  setCriticalRecordConfirmation: Dispatch<SetStateAction<string>>
  setPrimaryEndpointValue: Dispatch<SetStateAction<string>>
  setPublicRecordAcknowledged: Dispatch<SetStateAction<boolean>>
  setRecordDrafts: Dispatch<SetStateAction<Record<string, string>>>
  setRecordError: Dispatch<SetStateAction<string>>
  setRecordTxState: Dispatch<SetStateAction<DuskNameTxState | null>>
  setResolverRecordSets: Dispatch<SetStateAction<Record<string, ResolverRecord[]>>>
  shouldApplyPreviewWriteFallback: ConfirmedWriteFallback
  submitNameWrite: SubmitNameWrite
  walletAuthorized: boolean
  walletSetupState: WalletConnectionStatus
  ensureContractAuthorityForLiveWrite: (
    action: string,
    setError: (message: string) => void,
  ) => boolean
  ensurePublicBalanceForLiveWrite: (
    action: string,
    setError: (message: string) => void,
    minimumLux?: number,
    depositLux?: bigint,
  ) => Promise<boolean>
}
