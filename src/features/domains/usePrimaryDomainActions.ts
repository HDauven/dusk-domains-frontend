import type { Dispatch, SetStateAction } from 'react'
import {
  type DuskDomainCallMetadata,
  type DuskDomainTxState,
  type DuskDomainsIndexerClient,
  type DuskDomainsRuntimeConfig,
  type SubmitDuskDomainWriteOptions,
} from '../../names/internal'
import type { WalletConnectionStatus } from '../wallet/walletStatus'
import { clearPrimaryDomainName } from './clearPrimaryDomainName'
import { setPrimaryDomainName } from './setPrimaryDomainName'

type SubmitNameWrite = (
  name: string,
  call: DuskDomainCallMetadata,
  options?: SubmitDuskDomainWriteOptions,
) => Promise<DuskDomainTxState>

type AppendActivity = (input: {
  eventType: 'primary_name'
  actor: string
  target?: string
  txId?: string
}) => void

type ConfirmedWriteFallback = (
  description: string,
  check?: (client: DuskDomainsIndexerClient) => Promise<boolean>,
) => Promise<boolean>

export type UsePrimaryDomainActionsProps = {
  appendActivity: AppendActivity
  canClearPrimary: boolean
  canSetPrimary: boolean
  displayName: string
  nodeHex: string
  primaryEndpoint: string
  runtimeConfig: DuskDomainsRuntimeConfig
  selectedAuthority: string
  setPrimaryEndpointValue: Dispatch<SetStateAction<string>>
  setPrimaryError: Dispatch<SetStateAction<string>>
  setPrimaryName: Dispatch<SetStateAction<string | null>>
  setPrimaryTxState: Dispatch<SetStateAction<DuskDomainTxState | null>>
  shouldApplyPreviewWriteFallback: ConfirmedWriteFallback
  submitNameWrite: SubmitNameWrite
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

export function usePrimaryDomainActions(props: UsePrimaryDomainActionsProps) {
  return {
    handleClearPrimaryName: () => clearPrimaryDomainName(props),
    handleSetPrimaryName: () => setPrimaryDomainName(props),
  }
}
