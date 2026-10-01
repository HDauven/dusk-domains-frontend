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
  const workspace = submitNameWrite.captureWorkspace(displayName)
  setPrimaryError('')
  if (!guardDomainActionPrerequisite({
    canContinue: canSetPrimary,
    setError: setPrimaryError,
      walletSetupState,
    blockedCopy: 'Connect the manager wallet and enter a valid Dusk address before setting a primary name.',
  })) {
    return
  }
  if (!ensureContractAuthorityForLiveWrite('set the primary name', setPrimaryError)) return
  if (!(await ensurePublicBalanceForLiveWrite('setting the primary name', message => { if (workspace()) setPrimaryError(message) }))) return

  if (!workspace()) return

  try {
    const call = coreSetPrimaryNameRuntimeCall({
      endpointType: 'moonlight_address',
      endpointValue: primaryEndpoint,
      node: nodeHex,
      name: displayName,
    })
    const finalState = await submitNameWrite(displayName, call, {
      workspace,
      contracts: runtimeConfig.contracts,
      onUpdate: setPrimaryTxState,
    })
    if (!workspace()) return

    if (finalState.status === 'executed') {
      if (!(await shouldApplyPreviewWriteFallback('primary name', async (client) => {
        const indexed = await client.getPrimaryName({
          type: 'moonlight_address',
          value: primaryEndpoint,
        })
        return indexed === displayName
      }, workspace))) return
      if (!workspace()) return

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
    if (!workspace()) return
    setPrimaryError(userFacingErrorMessage(error))
  }
}
