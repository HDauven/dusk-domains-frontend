import { lifecycleHeightReached } from '../../features/domains/domainFormat'
import {
  primaryNameStatus,
  validateRecordValue,
  type ResolverRecord,
} from '../../names/internal'
import { abbreviate } from '../../utils/format'

export function derivePrimaryState({
  displayName,
  expiresAt,
  currentBlockHeight,
  nowSeconds,
  moonlightRecord,
  primaryEndpointValue,
  primaryName,
  selectedAddress,
}: {
  displayName: string
  expiresAt: number
  currentBlockHeight: number | null
  nowSeconds: number
  moonlightRecord: ResolverRecord | undefined
  primaryEndpointValue: string
  primaryName: string | null
  selectedAddress: string
}) {
  const primaryEndpoint = primaryEndpointValue.trim() || selectedAddress || moonlightRecord?.value || ''
  const primaryEndpointErrors = primaryEndpoint ? validateRecordValue('moonlight_address', primaryEndpoint) : []
  const forwardAddress = moonlightRecord?.value ?? ''
  const primaryVerification = primaryNameStatus({
    abbreviate,
    displayName,
    endpointErrors: forwardAddress ? validateRecordValue('moonlight_address', forwardAddress) : [],
    endpointValue: forwardAddress,
    forwardRecordValue: moonlightRecord?.value ?? null,
    primaryName: expiresAt > 0 && currentBlockHeight !== null && !lifecycleHeightReached(expiresAt, currentBlockHeight, nowSeconds) ? primaryName : null,
  })

  return {
    primaryEndpoint,
    primaryEndpointErrors,
    primaryVerification,
  }
}
