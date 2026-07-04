import {
  primaryNameStatus,
  validateRecordValue,
  type ResolverRecord,
} from '../../names/internal'
import { abbreviate } from '../../utils/format'

export function derivePrimaryState({
  displayName,
  moonlightRecord,
  primaryEndpointValue,
  primaryName,
  selectedAddress,
}: {
  displayName: string
  moonlightRecord: ResolverRecord | undefined
  primaryEndpointValue: string
  primaryName: string | null
  selectedAddress: string
}) {
  const primaryEndpoint = primaryEndpointValue.trim() || selectedAddress || moonlightRecord?.value || ''
  const primaryEndpointErrors = primaryEndpoint ? validateRecordValue('moonlight_address', primaryEndpoint) : []
  const primaryVerification = primaryNameStatus({
    abbreviate,
    displayName,
    endpointErrors: primaryEndpointErrors,
    endpointValue: primaryEndpoint,
    forwardRecordValue: moonlightRecord?.value ?? null,
    primaryName,
  })

  return {
    primaryEndpoint,
    primaryEndpointErrors,
    primaryVerification,
  }
}
