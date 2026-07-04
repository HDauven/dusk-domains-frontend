import type { Dispatch, SetStateAction } from 'react'
import type {
  DuskNameCallMetadata,
  DuskNamesIndexerClient,
  DuskNamesRuntimeConfig,
  DuskNameTxState,
  SubmitDuskNameWriteOptions,
  SubnameExpiryPolicy,
  SubnameRevocationPolicy,
  SubnameState,
} from '../../names/internal'
import type { WalletConnectionStatus } from '../wallet/walletStatus'

export type SubmitNameWrite = (
  name: string,
  call: DuskNameCallMetadata,
  options?: SubmitDuskNameWriteOptions,
) => Promise<DuskNameTxState>

export type AppendSubdomainActivity = (input: {
  eventType: 'subname_created'
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

export type UseSubdomainActionsProps = {
  appendActivity: AppendSubdomainActivity
  canCreateSubname: boolean
  canDelegateSubname: boolean
  canRevokeSelectedSubname: boolean
  currentBlockHeight: number | null
  delegateManager: string
  displayName: string
  managedNameExpiresAt: number
  nowSeconds: number
  runtimeConfig: DuskNamesRuntimeConfig
  selectedAddress: string
  selectedAuthority: string
  selectedDelegatedSubname: SubnameState | undefined
  setCriticalRecordConfirmation: Dispatch<SetStateAction<string>>
  setDelegateManager: Dispatch<SetStateAction<string>>
  setDelegateSubnameNode: Dispatch<SetStateAction<string>>
  setPublicRecordAcknowledged: Dispatch<SetStateAction<boolean>>
  setRecordDrafts: Dispatch<SetStateAction<Record<string, string>>>
  setRecordError: Dispatch<SetStateAction<string>>
  setRecordTargetNode: Dispatch<SetStateAction<string>>
  setSubnameError: Dispatch<SetStateAction<string>>
  setSubnames: Dispatch<SetStateAction<SubnameState[]>>
  setSubnameTxState: Dispatch<SetStateAction<DuskNameTxState | null>>
  shouldApplyPreviewWriteFallback: ConfirmedWriteFallback
  submitNameWrite: SubmitNameWrite
  walletSetupState: WalletConnectionStatus
  subnameExpiryDate: string
  subnameExpiryPolicy: SubnameExpiryPolicy
  subnameLabel: string
  subnameManager: string
  subnameResolver: string
  subnameRevocationPolicy: SubnameRevocationPolicy
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
