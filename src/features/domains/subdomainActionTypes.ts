import type { Dispatch, SetStateAction } from 'react'
import type { SubmitNameWrite } from '../../app/useDuskDomainWriter'
import type { ConfirmedWriteFallback } from '../../app/useIndexerWriteFallback'
import type { LiveWritePreflight } from '../../app/useLiveWritePreflight'
import type {
  DuskDomainsRuntimeConfig,
  DuskDomainTxState,
  SubnameExpiryPolicy,
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
  currentBlockHeight: number | null
  displayName: string
  managedNameExpiresAt: number
  nowSeconds: number
  runtimeConfig: DuskDomainsRuntimeConfig
  selectedAddress: string
  selectedAuthority: string
  setCriticalRecordConfirmation: Dispatch<SetStateAction<string>>
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
} & LiveWritePreflight
