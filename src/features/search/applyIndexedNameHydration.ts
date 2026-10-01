import {
  createManagedNameState,
} from '../../app/appHelpers'
import { lifecycleHeightFromIndexed, renewalGraceEnd, unixSecondsFromIso } from '../domains/domainFormat'
import { userFacingMessageFromText } from '../../names/internal'
import type { IndexedNameReadBundle } from './indexedNameReads'
import type { UseIndexedNameHydrationProps } from './indexedNameHydrationTypes'

export function applyIndexedNameHydration(
  {
    currentBlockHeight,
    nowSeconds,
    recordSourceContractId,
    setActivityEntries,
    setActivityCursor,
    setIndexerError,
    setManagedName,
    setPrimaryEndpointValue,
    setPrimaryName,
    setResolverRecordSets,
    setSubnames,
  }: UseIndexedNameHydrationProps,
  reads: IndexedNameReadBundle,
) {
  const {
    activityRead,
    forwardRead,
    hydratedSubnames,
    node,
    ownSubnameRead,
    primaryName,
    readErrors,
    stateRead,
  } = reads

  if (forwardRead.value) {
    setResolverRecordSets((current) => ({
      ...current,
      [node]: forwardRead.value.records,
    }))

    const moonlight = forwardRead.value.records.find((record) => record.key === 'moonlight_address')
    setPrimaryEndpointValue(moonlight?.value ?? '')
    setPrimaryName(moonlight ? primaryName : null)
  } else {
    setResolverRecordSets((current) => {
      const next = { ...current }
      delete next[node]
      return next
    })
    setPrimaryEndpointValue('')
    setPrimaryName(null)
  }

  if (stateRead.value) {
    // An unreported expiry stays unknown (0): the current one may be a placeholder.
    // Keep estimated grace ends in seconds so renewal can leave a safety margin.
    const indexed = stateRead.value
    const graceEndsAt = Number.isFinite(indexed.expiresAtBlockHeight)
      ? indexed.graceEndsAtBlockHeight ?? 0
      : renewalGraceEnd({
        expiresAt: unixSecondsFromIso(indexed.expiresAt) ?? 0,
        graceEndsAt: indexed.graceEndsAtBlockHeight ?? unixSecondsFromIso(indexed.graceEndsAt) ?? 0,
      })
    setManagedName({
      node,
      owner: indexed.owner ?? '',
      manager: indexed.manager ?? '',
      resolver: indexed.resolverId ?? recordSourceContractId,
      expiresAt: lifecycleHeightFromIndexed(
        stateRead.value?.expiresAt,
        stateRead.value?.expiresAtBlockHeight,
        currentBlockHeight,
        nowSeconds,
      ) ?? 0,
      graceEndsAt,
      expiryPolicy: ownSubnameRead.value?.expiryPolicy ?? null,
    })

  } else {
    setManagedName({ ...createManagedNameState(recordSourceContractId), node, owner: '', manager: '', expiresAt: 0, graceEndsAt: 0 })
  }

  setActivityEntries(activityRead.value ?? [])
  setActivityCursor({ node, cursor: reads.activityCursor })

  if (hydratedSubnames) {
    setSubnames(hydratedSubnames)
  } else {
    setSubnames([])
  }

  if (readErrors.length > 0) {
    setIndexerError(userFacingMessageFromText(readErrors[0], 'Some name data is still syncing. Refresh and try again.'))
  }
}
