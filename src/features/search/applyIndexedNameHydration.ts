import {
  createManagedNameState,
  fallbackManager,
  fallbackOwner,
} from '../../app/appHelpers'
import { lifecycleHeightFromIndexed } from '../domains/domainFormat'
import { userFacingMessageFromText } from '../../names/internal'
import type { IndexedNameReadBundle } from './indexedNameReads'
import type { UseIndexedNameHydrationProps } from './indexedNameHydrationTypes'

export function applyIndexedNameHydration(
  {
    currentBlockHeight,
    nowSeconds,
    recordSourceContractId,
    selectedAuthority,
    setActivityEntries,
    setDelegateManager,
    setDraftManager,
    setDraftOwner,
    setDraftResolver,
    setIndexerError,
    setManagedName,
    setPrimaryEndpointValue,
    setPrimaryName,
    setResolverRecordSets,
    setSubnameManager,
    setSubnames,
  }: UseIndexedNameHydrationProps,
  reads: IndexedNameReadBundle,
) {
  const {
    activityRead,
    forwardRead,
    hydratedSubnames,
    node,
    primaryName,
    readErrors,
    stateRead,
    subnameRecordSets,
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
    setManagedName((current) => ({
      owner: stateRead.value?.owner ?? current.owner,
      manager: stateRead.value?.manager ?? current.manager,
      resolver: stateRead.value?.resolverId ?? current.resolver,
      expiresAt: lifecycleHeightFromIndexed(
        stateRead.value?.expiresAt,
        stateRead.value?.expiresAtBlockHeight,
        currentBlockHeight,
        nowSeconds,
      ) ?? current.expiresAt,
      graceEndsAt: lifecycleHeightFromIndexed(
        stateRead.value?.graceEndsAt,
        stateRead.value?.graceEndsAtBlockHeight,
        currentBlockHeight,
        nowSeconds,
      ) ?? current.graceEndsAt,
    }))
    if (stateRead.value.owner) setDraftOwner(stateRead.value.owner)
    if (stateRead.value.manager) setDraftManager(stateRead.value.manager)
    if (stateRead.value.resolverId) setDraftResolver(stateRead.value.resolverId)
    const defaultSubnameManager = stateRead.value.manager || selectedAuthority || fallbackManager
    setSubnameManager((current) => (
      !current || current === fallbackManager || current === selectedAuthority ? defaultSubnameManager : current
    ))
    setDelegateManager((current) => current || defaultSubnameManager)
  } else {
    setManagedName(createManagedNameState(recordSourceContractId))
    setDraftOwner(fallbackOwner)
    setDraftManager(fallbackManager)
    setDraftResolver(recordSourceContractId)
    setSubnameManager(selectedAuthority || fallbackManager)
    setDelegateManager(selectedAuthority || '')
  }

  setActivityEntries(activityRead.value ?? [])

  if (hydratedSubnames) {
    setSubnames(hydratedSubnames)
    setResolverRecordSets((current) => ({
      ...current,
      ...subnameRecordSets,
    }))
  } else {
    setSubnames([])
  }

  if (readErrors.length > 0) {
    setIndexerError(userFacingMessageFromText(readErrors[0], 'Some domain data is still syncing. Refresh and try again.'))
  }
}
