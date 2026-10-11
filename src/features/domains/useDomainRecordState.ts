import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { emptyResolverRecords } from '../../app/appConstants'
import { isCriticalRecordKey } from '../../app/recordKeyPolicy'
import { recordDraftValuesFor, recordMutationPlan, type RecordMutationPlan, type ResolverRecord, type ResolverRecordKey } from '../../names/internal'
import type { RecordTargetOption } from './recordTypes'

export type UseDomainRecordStateArgs = {
  displayName: string
  editableRecordKeys: readonly ResolverRecordKey[]
  nodeHex: string
}

const noDrafts: Record<string, string> = {}
// Staged values change something when they would write a record, or can't be saved as they are.
const changesRecords = (plan: RecordMutationPlan) => plan.mutations.length > 0 || plan.errors.length > 0

export function useDomainRecordState({ displayName, editableRecordKeys, nodeHex }: UseDomainRecordStateArgs) {
  // Staged record changes, per name. They stay until saved or discarded, so leaving the records
  // panel or opening another name keeps them; closing the page asks first.
  const [draftsByNode, setDraftsByNode] = useState<Record<string, Record<string, string>>>({})
  const [resolverRecordSets, setResolverRecordSets] = useState<Record<string, ResolverRecord[]>>({})
  // Counts resets, so work started for the page that was left (a wallet address request) can tell.
  const [resetCount, setResetCount] = useState(0)
  const recordDrafts = (nodeHex ? draftsByNode[nodeHex] : undefined) ?? noDrafts
  const setRecordDrafts: Dispatch<SetStateAction<Record<string, string>>> = useCallback(update => {
    if (!nodeHex) return
    setDraftsByNode(current => {
      const previous = current[nodeHex] ?? noDrafts
      const next = typeof update === 'function' ? update(previous) : update
      if (next === previous) return current
      const others = Object.fromEntries(Object.entries(current).filter(([node]) => node !== nodeHex))
      return Object.keys(next).length ? { ...others, [nodeHex]: next } : others
    })
  }, [nodeHex])
  // Subnames are edited on their own page, with their own permissions and node.
  const activeRecordTarget: RecordTargetOption | undefined = nodeHex ? { node: nodeHex, name: displayName, label: displayName } : undefined
  const resolverRecords = nodeHex ? resolverRecordSets[nodeHex] ?? emptyResolverRecords : emptyResolverRecords
  const recordDraftValues = useMemo(() => recordDraftValuesFor(editableRecordKeys, resolverRecords, recordDrafts), [editableRecordKeys, recordDrafts, resolverRecords])
  const recordDraftPlan = useMemo(() => recordMutationPlan(editableRecordKeys, resolverRecords, recordDrafts), [editableRecordKeys, recordDrafts, resolverRecords])
  // Another name's staged values count unless its loaded records show they change nothing.
  const unsaved = changesRecords(recordDraftPlan) || Object.entries(draftsByNode).some(([node, drafts]) => node !== nodeHex
    && (!resolverRecordSets[node] || changesRecords(recordMutationPlan(editableRecordKeys, resolverRecordSets[node], drafts))))
  useEffect(() => {
    if (!unsaved) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      // Older browsers show the prompt only when a return value is set.
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [unsaved])
  return {
    searchActions: {
      // Opening another name drops its loaded records, not the changes staged for any name. Staged
      // values those records show change nothing go with them.
      reset: () => {
        setDraftsByNode(current => Object.fromEntries(Object.entries(current).filter(([node, drafts]) => !resolverRecordSets[node]
          || changesRecords(recordMutationPlan(editableRecordKeys, resolverRecordSets[node], drafts)))))
        setResolverRecordSets({})
        setResetCount(count => count + 1)
      },
      hydrate: (node: string, records: ResolverRecord[] | null) => {
        setResolverRecordSets(current => {
          const next = { ...current }
          if (records) next[node] = records
          else delete next[node]
          return next
        })
        // Staged changes the fresh records already show were saved, possibly after the name was left.
        if (records) setDraftsByNode(current => {
          const drafts = current[node]
          if (!drafts) return current
          if (changesRecords(recordMutationPlan(editableRecordKeys, records, drafts))) return current
          return Object.fromEntries(Object.entries(current).filter(([draftNode]) => draftNode !== node))
        })
      },
    },
    activeRecordTarget,
    criticalRecordChange: recordDraftPlan.mutations.some(mutation => isCriticalRecordKey(mutation.key as ResolverRecordKey)),
    moonlightRecord: resolverRecords.find(record => record.key === 'moonlight_address'),
    parentResolverRecords: resolverRecords,
    recordDraftErrors: recordDraftPlan.errors,
    recordDraftInvalid: recordDraftPlan.invalid,
    recordDraftMutations: recordDraftPlan.mutations,
    recordDraftValues, recordDrafts, resetCount, resolverRecordSets, resolverRecords,
    setRecordDrafts, setResolverRecordSets,
  }
}
