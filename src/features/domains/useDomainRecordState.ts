import { useMemo, useState } from 'react'
import { emptyResolverRecords } from '../../app/appConstants'
import { isCriticalRecordKey } from '../../app/recordKeyPolicy'
import { recordDraftValuesFor, recordMutationPlan, type ResolverRecord, type ResolverRecordKey } from '../../names/internal'
import type { RecordTargetOption } from './recordTypes'

export type UseDomainRecordStateArgs = {
  displayName: string
  editableRecordKeys: readonly ResolverRecordKey[]
  nodeHex: string
}

export function useDomainRecordState({ displayName, editableRecordKeys, nodeHex }: UseDomainRecordStateArgs) {
  const [recordDrafts, setRecordDrafts] = useState<Record<string, string>>({})
  const [resolverRecordSets, setResolverRecordSets] = useState<Record<string, ResolverRecord[]>>({})
  // Subnames are edited on their own page, with their own permissions and node.
  const activeRecordTarget: RecordTargetOption | undefined = nodeHex ? { node: nodeHex, name: displayName, label: displayName } : undefined
  const resolverRecords = nodeHex ? resolverRecordSets[nodeHex] ?? emptyResolverRecords : emptyResolverRecords
  const recordDraftValues = useMemo(() => recordDraftValuesFor(editableRecordKeys, resolverRecords, recordDrafts), [editableRecordKeys, recordDrafts, resolverRecords])
  const recordDraftPlan = useMemo(() => recordMutationPlan(editableRecordKeys, resolverRecords, recordDrafts), [editableRecordKeys, recordDrafts, resolverRecords])
  return {
    searchActions: {
      reset: () => { setResolverRecordSets({}); setRecordDrafts({}) },
      hydrate: (node: string, records: ResolverRecord[] | null) => {
        setResolverRecordSets(current => {
          const next = { ...current }
          if (records) next[node] = records
          else delete next[node]
          return next
        })
      },
    },
    activeRecordTarget,
    criticalRecordChange: recordDraftPlan.mutations.some(mutation => isCriticalRecordKey(mutation.key as ResolverRecordKey)),
    moonlightRecord: resolverRecords.find(record => record.key === 'moonlight_address'),
    parentResolverRecords: resolverRecords,
    recordDraftErrors: recordDraftPlan.errors,
    recordDraftMutations: recordDraftPlan.mutations,
    recordDraftValues, recordDrafts, resolverRecordSets, resolverRecords,
    setRecordDrafts, setResolverRecordSets,
  }
}
