import {
  applyRecordMutations,
  storeMutateRecordsSenderRequest,
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
  canRemoveRecords,
  nodeHex,
  runtimeConfig,
  selectedAuthority,
  setPrimaryEndpointValue,
  setRecordError,
  setRecordTxState,
  setResolverRecordSets,
  shouldApplyPreviewWriteFallback,
  submitNameWrite,
  walletSetupState,
  ensureContractAuthorityForLiveWrite,
  ensurePublicBalanceForLiveWrite,
}: UseDomainRecordActionsProps, record: ResolverRecord) {
  const workspace = submitNameWrite.captureWorkspace(activeRecordTarget?.name ?? '')
  setRecordError('')
  const target = activeRecordTarget
  if (!guardDomainActionPrerequisite({
    canContinue: Boolean(canRemoveRecords && target),
    setError: setRecordError,
      walletSetupState,
    blockedCopy: 'Connect the manager wallet before removing this record.',
  })) {
    return
  }
  if (!target) return
  if (!ensureContractAuthorityForLiveWrite('remove this record', setRecordError)) return
  if (!(await ensurePublicBalanceForLiveWrite('removing this record', message => { if (workspace()) setRecordError(message) }))) return

  if (!workspace()) return

  try {
    const mutation = { action: 'clear', key: record.key } satisfies CoreRecordMutationInput
    const call = storeMutateRecordsSenderRequest({
      node: target.node,
      mutations: [mutation],
    })
    const finalState = await submitNameWrite(target.name, call, {
      workspace,
      contracts: runtimeConfig.contracts,
      onUpdate: setRecordTxState,
    })
    if (!workspace()) return

    if (finalState.status !== 'executed') return

    const recordLabel = getRecordDefinition(record.key)?.label ?? 'Record'
    if (!(await shouldApplyPreviewWriteFallback(`${recordLabel.toLowerCase()} removal`, async (client) => {
      const indexed = await client.resolveForward(target.name)
      return !indexed.records.some((existing) => existing.key === record.key)
    }, workspace))) return
    if (!workspace()) return

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
    if (!workspace()) return
    setRecordError(userFacingErrorMessage(error))
  }
}
