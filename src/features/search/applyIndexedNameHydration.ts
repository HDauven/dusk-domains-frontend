import { isWebsiteVerification } from '../../names/http/verification'
import { createManagedNameState, type ManagedNameState } from '../../app/managedNameState'
import { lifecycleHeightFromIndexed, renewalGraceEnd, unixSecondsFromIso } from '../domains/domainFormat'
import type { IndexedNameReadBundle } from './indexedNameReads'
import type { UseIndexedNameHydrationProps } from './indexedNameHydrationTypes'

export function applyIndexedNameHydration(
  {
    currentBlockHeight,
    nowSeconds,
    recordSourceContractId,
    domain,
    records,
    activity,
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
    connectedPrimaryName,
    primaryEndpoint,
    readErrors,
    stateRead,
  } = reads

  if (readErrors.length) throw new Error(readErrors[0])

  records.hydrate(node, forwardRead.value?.records ?? null)
  let managedName: ManagedNameState

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
    managedName = {
      node,
      ...(isWebsiteVerification(indexed.verification) && JSON.stringify(indexed.verification) === JSON.stringify(forwardRead.value?.verification)
        ? { websiteVerification: { owner: indexed.owner ?? '', website: forwardRead.value?.records.find(record => record.key === 'website')?.value ?? '', result: indexed.verification } } : {}),
      ancestors: indexed.namespace?.ancestors,
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
    }

  } else {
    managedName = { ...createManagedNameState(recordSourceContractId), node, owner: '', manager: '', expiresAt: 0, graceEndsAt: 0 }
  }

  domain.hydrate({ managedName, primaryEndpoint, primaryName, connectedPrimaryName, subnames: hydratedSubnames ?? [] })
  activity.hydrate(node, activityRead.value ?? [], reads.activityCursor)

}
