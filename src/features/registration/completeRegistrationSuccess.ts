import {
  markRegistrationCompletionExecuted,
} from './registrationCompletionState'
import {
  removePendingNameReservation,
  type DuskDomainTxState,
} from '../../names/internal'
import type { UseRegistrationActionsProps } from './registrationActionTypes'
import type { createCompleteRegistrationRequest } from './completeRegistrationCall'

export async function applyCompleteRegistrationSuccess(
  {
    appendActivity,
    displayName,
    loadPendingReservations,
    nodeHex,
    preparedCommit,
    recordSourceContractId,
    registerSetsPrimary,
    registrationTargetAddress,
    runtimeConfig,
    selectedAuthority,
    setDraftManager,
    setDraftOwner,
    setDraftResolver,
    setManagedName,
    setPrimaryEndpointValue,
    setPrimaryName,
    setRegistrationCompletion,
    setResolverRecordSets,
    shouldApplyPreviewWriteFallback,
  }: UseRegistrationActionsProps,
  {
    finalState,
    request,
  }: {
    finalState: DuskDomainTxState
    request: ReturnType<typeof createCompleteRegistrationRequest>
  },
) {
  if (!preparedCommit) return

  removePendingNameReservation({
    chainId: runtimeConfig.chainId,
    controller: selectedAuthority,
    commitment: preparedCommit.commitment,
  })
  loadPendingReservations()
  setRegistrationCompletion((current) => markRegistrationCompletionExecuted(current))

  if (!(await shouldApplyPreviewWriteFallback('registration', async (client) => {
    const indexed = await client.searchName(displayName)
    const state = await client.getNameState(nodeHex)
    return indexed.status === 'registered'
      && state?.owner === selectedAuthority
      && state.manager === selectedAuthority
      && state.resolverId === recordSourceContractId
  }))) return

  setManagedName({
    owner: selectedAuthority,
    manager: selectedAuthority,
    resolver: recordSourceContractId,
    expiresAt: request.lifecycle.expiresAt,
    graceEndsAt: request.lifecycle.graceEndsAt,
  })
  setResolverRecordSets((current) => ({
    ...current,
    [nodeHex]: [
      request.initialMoonlightRecord,
      ...(current[nodeHex] ?? []).filter((existing) => existing.key !== request.initialMoonlightRecord.key),
    ],
  }))
  setPrimaryName(registerSetsPrimary ? displayName : null)
  setPrimaryEndpointValue(registrationTargetAddress)
  setDraftOwner(selectedAuthority)
  setDraftManager(selectedAuthority)
  setDraftResolver(recordSourceContractId)
  appendActivity({
    eventType: 'registration',
    actor: selectedAuthority,
    target: selectedAuthority,
    txId: finalState.txId,
  })
}
