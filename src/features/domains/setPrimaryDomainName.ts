import {
  coreSetPrimaryNameRuntimeCall,
  userFacingErrorMessage,
} from '../../names/internal'
import { guardDomainActionPrerequisite } from './domainActionGuards'
import type { UsePrimaryDomainActionsProps } from './usePrimaryDomainActions'

export async function setPrimaryDomainName({
  appendActivity,
  canSetPrimary,
  displayName,
  nodeHex,
  primaryEndpoint,
  runtimeConfig,
  selectedAuthority,
  setPrimaryEndpointValue,
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
    canContinue: canSetPrimary,
    setError: setPrimaryError,
      walletSetupState,
    blockedCopy: 'Connect the manager wallet and enter a valid Dusk Public Address before setting a primary domain.',
  })) {
    return
  }
  if (!ensureContractAuthorityForLiveWrite('set the primary domain', setPrimaryError)) return
  if (!(await ensurePublicBalanceForLiveWrite('setting the primary domain', setPrimaryError))) return

  try {
    const call = coreSetPrimaryNameRuntimeCall({
      endpointType: 'moonlight_address',
      endpointValue: primaryEndpoint,
      node: nodeHex,
      name: displayName,
    })
    const finalState = await submitNameWrite(displayName, call, {
      contracts: runtimeConfig.contracts,
      onUpdate: setPrimaryTxState,
    })

    if (finalState.status === 'executed') {
      if (!(await shouldApplyPreviewWriteFallback('primary domain', async (client) => {
        const indexed = await client.getPrimaryName({
          type: 'moonlight_address',
          value: primaryEndpoint,
        })
        return indexed === displayName
      }))) return

      setPrimaryName(displayName)
      setPrimaryEndpointValue(primaryEndpoint)
      appendActivity({
        eventType: 'primary_name',
        actor: selectedAuthority,
        target: primaryEndpoint,
        txId: finalState.txId,
      })
    }
  } catch (error) {
    setPrimaryError(userFacingErrorMessage(error))
  }
}
