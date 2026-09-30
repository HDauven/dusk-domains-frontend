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

  // The router picks the resolver that stores a new name's records, so take it from the index.
  let indexedResolver: string | null = null
  if (!(await shouldApplyPreviewWriteFallback('registration', async (client) => {
    const indexed = await client.searchName(displayName)
    const state = await client.getNameState(nodeHex)
    indexedResolver = state?.resolverId ?? null
    return indexed.status === 'registered'
      && state?.owner === selectedAuthority
      && state.manager === selectedAuthority
  }))) return

  setManagedName({
    owner: selectedAuthority,
    manager: selectedAuthority,
    resolver: indexedResolver ?? recordSourceContractId,
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
  appendActivity({
    eventType: 'registration',
    actor: selectedAuthority,
    target: selectedAuthority,
    txId: finalState.txId,
  })
}
