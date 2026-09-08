import type { Dispatch, SetStateAction } from 'react'
import type { SubmitNameWrite } from '../../app/useDuskDomainWriter'
import type { ConfirmedWriteFallback } from '../../app/useIndexerWriteFallback'
import type { LiveWritePreflight } from '../../app/useLiveWritePreflight'
import type { DuskDomainTxState, DuskDomainsRuntimeConfig } from '../../names/internal'
import type { WalletConnectionStatus } from '../wallet/walletStatus'
import { clearPrimaryDomainName } from './clearPrimaryDomainName'
import { setPrimaryDomainName } from './setPrimaryDomainName'

type AppendActivity = (input: {
  eventType: 'primary_name'
  actor: string
  target?: string
  txId?: string
}) => void

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
} & LiveWritePreflight

export function usePrimaryDomainActions(props: UsePrimaryDomainActionsProps) {
  return {
    handleClearPrimaryName: () => clearPrimaryDomainName(props),
    handleSetPrimaryName: () => setPrimaryDomainName(props),
  }
}
