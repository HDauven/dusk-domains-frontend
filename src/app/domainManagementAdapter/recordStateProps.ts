import type { AppViewModelInputs } from '../appViewTypes'

export function buildDomainRecordStateProps({
  domainRecordState,
}: AppViewModelInputs) {
  const {
    activeRecordTarget,
    criticalRecordChange,
    criticalRecordConfirmation,
    moonlightRecord,
    publicRecordAcknowledged,
    recordDraftErrors,
    recordDraftMutations,
    recordDraftValues,
    recordTargetOptions,
    resolverRecords,
    setCriticalRecordConfirmation,
    setPublicRecordAcknowledged,
    setRecordDrafts,
    setRecordTargetNode,
    setResolverRecordSets,
  } = domainRecordState

  return {
    activeRecordTarget,
    criticalRecordChange,
    criticalRecordConfirmation,
    moonlightRecord,
    publicRecordAcknowledged,
    recordDraftErrors,
    recordDraftMutations,
    recordDraftValues,
    recordTargetOptions,
    resolverRecords,
    setCriticalRecordConfirmation,
    setPublicRecordAcknowledged,
    setRecordDrafts,
    setRecordTargetNode,
    setResolverRecordSets,
  }
}
