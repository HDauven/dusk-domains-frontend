import {
  coreClearPrimaryNameRuntimeCall,
  userFacingErrorMessage,
} from '../../names/internal'
import { guardDomainActionPrerequisite } from './domainActionGuards'
import type { UsePrimaryDomainActionsProps } from './usePrimaryDomainActions'

export async function clearPrimaryDomainName({
  appendActivity,
  canClearPrimary,
  displayName,
  primaryEndpoint,
  runtimeConfig,
  selectedAuthority,
  setPrimaryError,
  setPrimaryName,
  setPrimaryTxState,
  shouldApplyPreviewWriteFallback,
  submitNameWrite,
  walletSetupState,
  ensureContractAuthorityForLiveWrite,
  ensurePublicBalanceForLiveWrite,
}: UsePrimaryDomainActionsProps) {
  setPrimaryError('')
  if (!guardDomainActionPrerequisite({
    canContinue: canClearPrimary,
    setError: setPrimaryError,
      walletSetupState,
    blockedCopy: 'Connect the manager wallet and enter the current Dusk Public Address before clearing the primary domain.',
  })) {
    return
  }
  if (!ensureContractAuthorityForLiveWrite('clear the primary domain', setPrimaryError)) return
  if (!(await ensurePublicBalanceForLiveWrite('clearing the primary domain', setPrimaryError))) return

  try {
    const call = coreClearPrimaryNameRuntimeCall({
      endpointType: 'moonlight_address',
      endpointValue: primaryEndpoint,
    })
    const finalState = await submitNameWrite(displayName, call, {
      contracts: runtimeConfig.contracts,
      onUpdate: setPrimaryTxState,
    })

    if (finalState.status === 'executed') {
      if (!(await shouldApplyPreviewWriteFallback('cleared primary domain', async (client) => {
        const indexed = await client.getPrimaryName({
          type: 'moonlight_address',
          value: primaryEndpoint,
        })
        return indexed === null
      }))) return

      setPrimaryName(null)
      appendActivity({
        eventType: 'primary_name',
        actor: selectedAuthority,
        target: 'cleared',
        txId: finalState.txId,
      })
    }
  } catch (error) {
    setPrimaryError(userFacingErrorMessage(error))
  }
}
