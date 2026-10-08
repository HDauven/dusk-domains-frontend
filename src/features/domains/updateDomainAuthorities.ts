import { resolveRecipient, type ResolvedRecipient } from '../identity/resolveRecipient'
import { sameAuthority } from '../identity/ownerLabel'
import {
  storeUpdateAuthoritiesRequest,
  userFacingErrorMessage,
  userFacingMessageFromText,
} from '../../names/internal'
import { guardDomainActionPrerequisite } from './domainActionGuards'
import type { UseDomainSettingsActionsProps } from './domainSettingsActionTypes'

export async function updateDomainAuthorities({
  appendActivity,
  canManageName,
  displayName,
  indexerClient,
  managedName,
  nodeHex,
  runtimeConfig,
  selectedAuthority,
  setManagedName,
  setManagementError,
  setManagementTxState,
  shouldApplyPreviewWriteFallback,
  submitNameWrite,
  walletSetupState,
  ensureContractAuthorityForLiveWrite,
  ensurePublicBalanceForLiveWrite,
}: UseDomainSettingsActionsProps, change: { kind: 'transfer' | 'manager'; recipient: ResolvedRecipient; clearRecords?: boolean }) {
  const workspace = submitNameWrite.captureWorkspace(displayName)
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
  if (!(await ensurePublicBalanceForLiveWrite('updating ownership', message => { if (workspace()) setManagementError(message) }))) return

  if (!workspace()) return

  try {
    const checked = await resolveRecipient(change.recipient.input, indexerClient)
    if (!workspace()) return
    if (checked.address !== change.recipient.address || !sameAuthority(checked.authority, change.recipient.authority)) {
      setManagementError('The recipient changed. Check the address again before confirming.')
      return
    }
    const nextOwner = change.kind === 'transfer' ? checked.authority : managedName.owner
    const nextManager = checked.authority
    if (
      nextOwner.toLowerCase() === managedName.owner.toLowerCase() &&
      nextManager.toLowerCase() === managedName.manager.toLowerCase()
    ) {
      setManagementError('This wallet already has that role.')
      return
    }

    const call = storeUpdateAuthoritiesRequest({
      node: nodeHex,
      owner: nextOwner,
      manager: nextManager,
      clearRecords: change.kind === 'transfer' && (change.clearRecords ?? true),
    })
    call.reviewedRecipient = { address: checked.address, kind: change.kind,
      ...(/\.dusk$/i.test(checked.input) ? { name: checked.input } : {}),
    }
    const finalState = await submitNameWrite(displayName, call, {
      ownershipChange: change.kind,
      workspace,
      contracts: runtimeConfig.contracts,
      onUpdate: setManagementTxState,
    })
    if (!workspace()) return

    if (finalState.status !== 'executed') {
      setManagementError(finalState.message ? userFacingMessageFromText(finalState.message) : 'The change was not completed.')
      return
    }
    if (finalState.ownershipConfirmed !== undefined) return finalState.ownershipConfirmed

    setManagedName(current => current.node === nodeHex ? { ...current, owner: '', manager: '' } : current)
    const applyLocally = await shouldApplyPreviewWriteFallback(change.kind === 'transfer' ? 'transfer' : 'manager change', async (client) => {
      const state = await client.getNameState(nodeHex)
      return state?.owner === nextOwner && state.manager === nextManager
    }, workspace)
    if (!workspace()) return
    if (applyLocally === null) return false
    if (!applyLocally) return true

    setManagedName((current) => ({
      ...current,
      owner: nextOwner,
      manager: nextManager,
    }))
    appendActivity({
      eventType: 'transfer',
      actor: selectedAuthority,
      target: nextOwner,
      txId: finalState.txId,
    })
    return true
  } catch (error) {
    if (!workspace()) return
    setManagementError(userFacingErrorMessage(error))
  }
}
