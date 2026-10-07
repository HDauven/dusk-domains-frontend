import {
  storeClearPrimaryNameRequest,
  userFacingErrorMessage,
} from '../../names/internal'
import { guardDomainActionPrerequisite } from './domainActionGuards'
import type { UsePrimaryDomainActionsProps } from './usePrimaryDomainActions'

export async function clearPrimaryDomainName({
  appendActivity,
  canClearPrimary,
  displayName,
  primaryEndpoint,
  moonlightRecord,
  runtimeConfig,
  selectedAuthority,
  setPrimaryError,
  setPrimaryName,
  setConnectedPrimaryName,
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
    blockedCopy: 'Connect the wallet for this Dusk address before clearing its primary name.',
  })) {
    return
  }
  if (!ensureContractAuthorityForLiveWrite('clear the primary name', setPrimaryError)) return
  if (!(await ensurePublicBalanceForLiveWrite('clearing the primary name', message => { if (workspace()) setPrimaryError(message) }))) return

  if (!workspace()) return

  try {
    const call = storeClearPrimaryNameRequest({
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

      setConnectedPrimaryName(null)
      if (moonlightRecord?.value === primaryEndpoint) setPrimaryName(null)
      appendActivity({
        eventType: 'primary_name_cleared',
        actor: selectedAuthority,
        target: `moonlight_address:${primaryEndpoint}`,
        txId: finalState.txId,
      })
    }
  } catch (error) {
    if (!workspace()) return
    setPrimaryError(userFacingErrorMessage(error))
  }
}
