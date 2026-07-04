import { useMemo, useState } from 'react'
import { emptyResolverRecords } from '../../app/appConstants'
import { isCriticalRecordKey } from '../../app/appHelpers'
import {
  recordDraftValuesFor,
  recordMutationPlan,
  type ResolverRecord,
  type ResolverRecordKey,
  type SubnameState,
} from '../../names/internal'
import type { RecordTargetOption } from './recordTypes'

export type UseDomainRecordStateArgs = {
  activeSubnames: SubnameState[]
  displayName: string
  editableRecordKeys: readonly ResolverRecordKey[]
  nodeHex: string
}

export function useDomainRecordState({
  activeSubnames,
  displayName,
  editableRecordKeys,
  nodeHex,
}: UseDomainRecordStateArgs) {
  const [criticalRecordConfirmation, setCriticalRecordConfirmation] = useState('')
  const [publicRecordAcknowledged, setPublicRecordAcknowledged] = useState(false)
  const [recordDrafts, setRecordDrafts] = useState<Record<string, string>>({})
  const [recordTargetNode, setRecordTargetNode] = useState('')
  const [resolverRecordSets, setResolverRecordSets] = useState<Record<string, ResolverRecord[]>>({})

  const recordTargetOptions = useMemo<RecordTargetOption[]>(() => {
    if (!nodeHex) return []
    return [
      { node: nodeHex, name: displayName, label: 'Parent name' },
      ...activeSubnames.map((subname) => ({
        node: subname.node,
        name: subname.name,
        label: 'Subdomain',
      })),
    ]
  }, [activeSubnames, displayName, nodeHex])

  const activeRecordTarget = recordTargetOptions.find((target) => target.node === recordTargetNode)
    ?? recordTargetOptions[0]
  const resolverRecords = activeRecordTarget ? resolverRecordSets[activeRecordTarget.node] ?? emptyResolverRecords : emptyResolverRecords
  const parentResolverRecords = nodeHex ? resolverRecordSets[nodeHex] ?? emptyResolverRecords : emptyResolverRecords
  const recordDraftValues = useMemo(
    () => recordDraftValuesFor(editableRecordKeys, resolverRecords, recordDrafts),
    [editableRecordKeys, recordDrafts, resolverRecords],
  )
  const recordDraftPlan = useMemo(
    () => recordMutationPlan(editableRecordKeys, resolverRecords, recordDrafts),
    [editableRecordKeys, recordDrafts, resolverRecords],
  )
  const recordDraftMutations = recordDraftPlan.mutations
  const recordDraftErrors = recordDraftPlan.errors
  const criticalRecordChange = recordDraftMutations.some((mutation) => (
    isCriticalRecordKey(mutation.key as ResolverRecordKey)
  ))
  const criticalRecordConfirmationMatches = criticalRecordConfirmation.trim() === (activeRecordTarget?.name ?? displayName)
  const moonlightRecord = parentResolverRecords.find((record) => record.key === 'moonlight_address')

  return {
    activeRecordTarget,
    criticalRecordChange,
    criticalRecordConfirmation,
    criticalRecordConfirmationMatches,
    moonlightRecord,
    parentResolverRecords,
    publicRecordAcknowledged,
    recordDraftErrors,
    recordDraftMutations,
    recordDraftValues,
    recordDrafts,
    recordTargetNode,
    recordTargetOptions,
    resolverRecordSets,
    resolverRecords,
    setCriticalRecordConfirmation,
    setPublicRecordAcknowledged,
    setRecordDrafts,
    setRecordTargetNode,
    setResolverRecordSets,
  }
}
