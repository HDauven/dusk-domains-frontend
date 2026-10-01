import { clearReservationPrimaryChoice } from './reservationPrimaryChoice'
import {
  markRegistrationCompletionExecuted,
  markRegistrationCompletionFailed,
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
    selectedAddress,
    setManagedName,
    setPrimaryEndpointValue,
    setPrimaryName,
    setConnectedPrimaryName,
    setRegistrationCompletion,
    setResolverRecordSets,
    shouldApplyPreviewWriteFallback,
  }: UseRegistrationActionsProps,
  {
    finalState,
    request,
    workspace = () => true,
  }: {
    finalState: DuskDomainTxState
    workspace?: () => boolean
    request: ReturnType<typeof createCompleteRegistrationRequest>
  },
) {
  if (!preparedCommit) return

  // The router picks the resolver that stores a new name's records, so take it from the index.
  let indexedResolver: string | null = null
  let registered = false
  const applyLocally = await shouldApplyPreviewWriteFallback('registration', async (client) => {
    const indexed = await client.searchName(displayName)
    const state = await client.getNameState(nodeHex)
    indexedResolver = state?.resolverId ?? null
    registered = indexed.status === 'registered'
      && state?.owner === selectedAuthority
      && state.manager === selectedAuthority
    return registered
  }, workspace)
  if (!workspace()) return
  // A wallet can report a reverted reveal as executed. Keep the saved reservation, so the
  // registration can be retried, until the index shows the name registered to this account.
  if (!applyLocally && !registered) {
    setRegistrationCompletion(current => markRegistrationCompletionFailed(current, 'Your transaction was submitted, but registration is not confirmed yet. Your reservation is saved in My names. Check it before retrying.'))
    return
  }
  setRegistrationCompletion(current => markRegistrationCompletionExecuted(current))
  if (applyLocally || registered) {
    removePendingNameReservation({
      chainId: runtimeConfig.chainId,
      controller: selectedAuthority,
      commitment: preparedCommit.commitment,
    })
    clearReservationPrimaryChoice({ chainId: runtimeConfig.chainId, commitment: preparedCommit.commitment })
    loadPendingReservations()
  }
  if (!applyLocally) return

  setManagedName({
    node: nodeHex,
    owner: selectedAuthority,
    manager: selectedAuthority,
    resolver: indexedResolver ?? recordSourceContractId,
    expiresAt: request.lifecycle.expiresAt,
    graceEndsAt: request.lifecycle.graceEndsAt,
    expiryPolicy: null,
  })
  setResolverRecordSets((current) => ({
    ...current,
    [nodeHex]: [
      request.initialMoonlightRecord,
      ...(current[nodeHex] ?? []).filter((existing) => existing.key !== request.initialMoonlightRecord.key),
    ],
  }))
  setPrimaryName(registerSetsPrimary ? displayName : null)
  if (registerSetsPrimary && registrationTargetAddress === selectedAddress) setConnectedPrimaryName(displayName)
  setPrimaryEndpointValue(registrationTargetAddress)
  appendActivity({
    eventType: 'registration',
    actor: selectedAuthority,
    target: selectedAuthority,
    txId: finalState.txId,
  })
}
