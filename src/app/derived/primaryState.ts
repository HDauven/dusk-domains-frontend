import { lifecycleHeightReached } from '../../features/domains/domainFormat'
import { sameAuthority } from '../../features/identity/ownerLabel'
import type { ManagedNameState } from '../managedNameState'
import {
  primaryNameStatus,
  validateRecordValue,
  type ResolverRecord,
} from '../../names/internal'
import { abbreviate } from '../../utils/format'

export function derivePrimaryState({
  displayName,
  managedName,
  currentBlockHeight,
  nowSeconds,
  moonlightRecord,
  primaryEndpointValue,
  primaryName,
  connectedPrimaryName,
  selectedAddress,
}: {
  displayName: string
  managedName: ManagedNameState | null
  currentBlockHeight: number | null
  nowSeconds: number
  moonlightRecord: ResolverRecord | undefined
  primaryEndpointValue: string
  primaryName: string | null
  connectedPrimaryName: string | null
  selectedAddress: string
}) {
  const primaryEndpoint = primaryEndpointValue.trim() || selectedAddress || moonlightRecord?.value || ''
  const primaryEndpointErrors = primaryEndpoint ? validateRecordValue('moonlight_address', primaryEndpoint) : []
  const forwardAddress = moonlightRecord?.value ?? ''
  const expired = Boolean(managedName && lifecycleHeightReached(managedName.expiresAt, currentBlockHeight, nowSeconds))
  const active = Boolean(managedName && managedName.expiresAt > 0 && currentBlockHeight !== null && !expired)
  const authorized = Boolean(managedName && [managedName.owner, managedName.manager].some(authority => sameAuthority(authority, forwardAddress)))
  const primaryVerification = primaryNameStatus({
    abbreviate,
    displayName,
    endpointErrors: forwardAddress ? validateRecordValue('moonlight_address', forwardAddress) : [],
    endpointValue: forwardAddress,
    forwardRecordValue: moonlightRecord?.value ?? null,
    primaryName: active && authorized ? primaryName : null,
  })
  const unresolvedMapping = connectedPrimaryName === displayName
    && !(primaryVerification.verified && forwardAddress === selectedAddress)
  const cleanupDescription = !unresolvedMapping ? undefined : expired
    ? 'This name no longer resolves as your primary because it has expired. Renew it if eligible, clear it or choose another.'
    : managedName?.inMarketplaceEscrow
      ? 'Your primary name is paused while this name is listed for sale. Check it again after cancellation, or clear it and choose another.'
      : 'This name no longer resolves as your primary; clear it or choose another.'

  return {
    primaryEndpoint,
    primaryEndpointErrors,
    primaryVerification: { ...primaryVerification, cleanupDescription },
  }
}
