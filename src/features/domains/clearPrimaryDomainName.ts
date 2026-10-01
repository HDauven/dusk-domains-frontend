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
  const workspace = submitNameWrite.captureWorkspace(displayName)
  setPrimaryError('')
  if (!guardDomainActionPrerequisite({
    canContinue: canClearPrimary,
    setError: setPrimaryError,
      walletSetupState,
    blockedCopy: 'Connect the manager wallet and enter the current Dusk address before clearing the primary name.',
  })) {
    return
  }
  if (!ensureContractAuthorityForLiveWrite('clear the primary name', setPrimaryError)) return
  if (!(await ensurePublicBalanceForLiveWrite('clearing the primary name', message => { if (workspace()) setPrimaryError(message) }))) return

  if (!workspace()) return

  try {
    const call = coreClearPrimaryNameRuntimeCall({
      endpointType: 'moonlight_address',
      endpointValue: primaryEndpoint,
    })
    const finalState = await submitNameWrite(displayName, call, {
      workspace,
      contracts: runtimeConfig.contracts,
      onUpdate: setPrimaryTxState,
    })
    if (!workspace()) return

    if (finalState.status === 'executed') {
      if (!(await shouldApplyPreviewWriteFallback('cleared primary name', async (client) => {
        const indexed = await client.getPrimaryName({
          type: 'moonlight_address',
          value: primaryEndpoint,
        })
        return indexed === null
      }, workspace))) return
      if (!workspace()) return

      setPrimaryName(null)
      appendActivity({
        eventType: 'primary_name',
        actor: selectedAuthority,
        target: 'cleared',
        txId: finalState.txId,
      })
    }
  } catch (error) {
    if (!workspace()) return
    setPrimaryError(userFacingErrorMessage(error))
  }
}
