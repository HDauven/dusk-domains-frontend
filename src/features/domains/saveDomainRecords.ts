import { pluralize } from '../registration/registrationCopy'
import {
  applyRecordMutations,
  coreMutateRecordsSenderRuntimeCall,
  userFacingErrorMessage,
} from '../../names/internal'
import { guardDomainActionPrerequisite } from './domainActionGuards'
import type { UseDomainRecordActionsProps } from './domainRecordActionTypes'

export async function saveDomainRecords({
  activeRecordTarget,
  appendActivity,
  canSaveRecords,
  criticalRecordChange,
  nodeHex,
  recordDraftErrors,
  recordDraftMutations,
  runtimeConfig,
  selectedAuthority,
  setCriticalRecordConfirmation,
  setPrimaryEndpointValue,
  setPublicRecordAcknowledged,
  setRecordDrafts,
  setRecordError,
  setRecordTxState,
  setResolverRecordSets,
  shouldApplyPreviewWriteFallback,
  submitNameWrite,
  walletSetupState,
  ensureContractAuthorityForLiveWrite,
  ensurePublicBalanceForLiveWrite,
}: UseDomainRecordActionsProps) {
  setRecordError('')
  if (!canSaveRecords) {
    if (recordDraftErrors.length > 0) {
      setRecordError(recordDraftErrors[0])
      return
    }
    if (recordDraftMutations.length === 0) {
      setRecordError('Change at least one record before saving.')
      return
    }
    guardDomainActionPrerequisite({
      canContinue: false,
      setError: setRecordError,
      walletSetupState,
      blockedCopy: criticalRecordChange
        ? 'Confirm the domain, check the public-record notice, and connect the manager wallet before saving.'
        : 'Check the public-record notice and connect the manager wallet before saving.',
    })
    return
  }
  if (!ensureContractAuthorityForLiveWrite('save these records', setRecordError)) return
  if (!(await ensurePublicBalanceForLiveWrite('saving these records', setRecordError))) return

  try {
    const target = activeRecordTarget
    if (!target) throw new Error('Choose a valid record target.')

    const mutations = recordDraftMutations
    const call = coreMutateRecordsSenderRuntimeCall({
      node: target.node,
      mutations,
    })
    const finalState = await submitNameWrite(target.name, call, {
      contracts: runtimeConfig.contracts,
      onUpdate: setRecordTxState,
    })

    if (finalState.status !== 'executed') return

    if (!(await shouldApplyPreviewWriteFallback('record update', async (client) => {
      const indexed = await client.resolveForward(target.name)
      return mutations.every((mutation) => {
        if (mutation.action === 'clear') {
          return !indexed.records.some((existing) => existing.key === mutation.key)
        }
        return indexed.records.some((existing) => (
          existing.key === mutation.key && existing.value === mutation.value
        ))
      })
    }))) return

    setResolverRecordSets((current) => ({
      ...current,
      [target.node]: applyRecordMutations(current[target.node] ?? [], mutations),
    }))
    const moonlightMutation = mutations.find((mutation) => (
      mutation.key === 'moonlight_address'
    ))
    if (target.node === nodeHex && moonlightMutation) {
      setPrimaryEndpointValue(moonlightMutation.action === 'set' ? moonlightMutation.value : '')
    }
    appendActivity({
      eventType: 'record_update',
      actor: selectedAuthority,
      target: `${mutations.length} ${pluralize(mutations.length, 'record')}`,
      txId: finalState.txId,
      node: target.node,
      name: target.name,
    })
    setRecordDrafts({})
    setPublicRecordAcknowledged(false)
    setCriticalRecordConfirmation('')
  } catch (error) {
    setRecordError(userFacingErrorMessage(error))
  }
}
