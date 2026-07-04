import {
  applyRecordMutations,
  coreMutateRecordsSenderRuntimeCall,
  getRecordDefinition,
  userFacingErrorMessage,
  type CoreRecordMutationInput,
  type ResolverRecord,
} from '../../names/internal'
import { guardDomainActionPrerequisite } from './domainActionGuards'
import type { UseDomainRecordActionsProps } from './domainRecordActionTypes'

export async function clearDomainRecord({
  activeRecordTarget,
  appendActivity,
  nodeHex,
  recordBusy,
  runtimeConfig,
  selectedAddress,
  selectedAuthority,
  setPrimaryEndpointValue,
  setRecordError,
  setRecordTxState,
  setResolverRecordSets,
  shouldApplyPreviewWriteFallback,
  submitNameWrite,
  walletAuthorized,
  walletSetupState,
  ensureContractAuthorityForLiveWrite,
  ensurePublicBalanceForLiveWrite,
}: UseDomainRecordActionsProps, record: ResolverRecord) {
  setRecordError('')
  const target = activeRecordTarget
  if (!guardDomainActionPrerequisite({
    canContinue: Boolean(walletAuthorized && selectedAddress && target && !recordBusy),
    setError: setRecordError,
      walletSetupState,
    blockedCopy: 'Connect the manager wallet before removing this record.',
  })) {
    return
  }
  if (!target) return
  if (!ensureContractAuthorityForLiveWrite('remove this record', setRecordError)) return
  if (!(await ensurePublicBalanceForLiveWrite('removing this record', setRecordError))) return

  try {
    const mutation = { action: 'clear', key: record.key } satisfies CoreRecordMutationInput
    const call = coreMutateRecordsSenderRuntimeCall({
      node: target.node,
      mutations: [mutation],
    })
    const finalState = await submitNameWrite(target.name, call, {
      contracts: runtimeConfig.contracts,
      onUpdate: setRecordTxState,
    })

    if (finalState.status !== 'executed') return

    const recordLabel = getRecordDefinition(record.key)?.label ?? 'Record'
    if (!(await shouldApplyPreviewWriteFallback(`${recordLabel.toLowerCase()} removal`, async (client) => {
      const indexed = await client.resolveForward(target.name)
      return !indexed.records.some((existing) => existing.key === record.key)
    }))) return

    setResolverRecordSets((current) => ({
      ...current,
      [target.node]: applyRecordMutations(current[target.node] ?? [], [mutation]),
    }))
    if (target.node === nodeHex && record.key === 'moonlight_address') {
      setPrimaryEndpointValue('')
    }
    appendActivity({
      eventType: 'record_update',
      actor: selectedAuthority,
      target: record.key,
      txId: finalState.txId,
      node: target.node,
      name: target.name,
    })
  } catch (error) {
    setRecordError(userFacingErrorMessage(error))
  }
}
