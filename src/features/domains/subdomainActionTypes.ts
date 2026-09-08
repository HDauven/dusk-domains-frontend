import type { Dispatch, SetStateAction } from 'react'
import type { SubmitNameWrite } from '../../app/useDuskDomainWriter'
import type { ConfirmedWriteFallback } from '../../app/useIndexerWriteFallback'
import type { LiveWritePreflight } from '../../app/useLiveWritePreflight'
import type {
  DuskDomainsRuntimeConfig,
  DuskDomainTxState,
  SubnameExpiryPolicy,
  SubnameRevocationPolicy,
  SubnameState,
} from '../../names/internal'
import type { WalletConnectionStatus } from '../wallet/walletStatus'

export type { SubmitNameWrite, ConfirmedWriteFallback }

export type AppendSubdomainActivity = (input: {
  eventType: 'subname_created'
  actor: string
  target?: string
  txId?: string
  node?: string
  name?: string
}) => void

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
  runtimeConfig: DuskDomainsRuntimeConfig
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
  setSubnameTxState: Dispatch<SetStateAction<DuskDomainTxState | null>>
  shouldApplyPreviewWriteFallback: ConfirmedWriteFallback
  submitNameWrite: SubmitNameWrite
  walletSetupState: WalletConnectionStatus
  subnameExpiryDate: string
  subnameExpiryPolicy: SubnameExpiryPolicy
  subnameLabel: string
  subnameManager: string
  subnameResolver: string
  subnameRevocationPolicy: SubnameRevocationPolicy
} & LiveWritePreflight
