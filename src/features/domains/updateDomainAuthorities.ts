import { contractPrincipalInput } from '../../app/appHelpers'
import {
  coreUpdateAuthoritiesRuntimeCall,
  userFacingErrorMessage,
  userFacingMessageFromText,
} from '../../names/internal'
import { guardDomainActionPrerequisite } from './domainActionGuards'
import type { UseDomainSettingsActionsProps } from './domainSettingsActionTypes'

export async function updateDomainAuthorities({
  appendActivity,
  canManageName,
  displayName,
  draftManager,
  draftOwner,
  managedName,
  nodeHex,
  runtimeConfig,
  selectedAuthority,
  setDraftManager,
  setDraftOwner,
  setManagedName,
  setManagementError,
  setManagementTxState,
  shouldApplyPreviewWriteFallback,
  submitNameWrite,
  walletSetupState,
  ensureContractAuthorityForLiveWrite,
  ensurePublicBalanceForLiveWrite,
}: UseDomainSettingsActionsProps) {
  setManagementError('')
  if (!guardDomainActionPrerequisite({
    canContinue: canManageName,
    setError: setManagementError,
      walletSetupState,
    blockedCopy: 'Confirm the exact name and connect the owner wallet before changing ownership.',
  })) {
    return
  }
  if (!ensureContractAuthorityForLiveWrite('update ownership', setManagementError)) return
  if (!(await ensurePublicBalanceForLiveWrite('updating ownership', setManagementError))) return

  try {
    const nextOwner = contractPrincipalInput(draftOwner, 'Owner authority')
    const nextManager = contractPrincipalInput(draftManager, 'Manager authority')
    if (
      nextOwner.toLowerCase() === managedName.owner.toLowerCase() &&
      nextManager.toLowerCase() === managedName.manager.toLowerCase()
    ) {
      setManagementError('No authority changes to save.')
      return
    }

    const call = coreUpdateAuthoritiesRuntimeCall({
      node: nodeHex,
      owner: nextOwner,
      manager: nextManager,
    })
    const finalState = await submitNameWrite(displayName, call, {
      contracts: runtimeConfig.contracts,
      onUpdate: setManagementTxState,
    })

    if (finalState.status !== 'executed') {
      setManagementError(finalState.message ? userFacingMessageFromText(finalState.message) : 'Authority update was not completed.')
      return
    }

    if (!(await shouldApplyPreviewWriteFallback('authority update', async (client) => {
      const state = await client.getNameState(nodeHex)
      return state?.owner === nextOwner && state.manager === nextManager
    }))) return

    setManagedName((current) => ({
      ...current,
      owner: nextOwner,
      manager: nextManager,
    }))
    setDraftOwner(nextOwner)
    setDraftManager(nextManager)
    appendActivity({
      eventType: 'transfer',
      actor: selectedAuthority,
      target: nextOwner,
      txId: finalState.txId,
    })
  } catch (error) {
    setManagementError(userFacingErrorMessage(error))
  }
}
