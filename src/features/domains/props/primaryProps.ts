import type {
  DomainManagementFeatureProps,
  UseDomainManagementFeatureProps,
} from '../domainManagementFeatureTypes'
import type { AsyncAction } from './types'

type PrimaryPropsArgs = Pick<
  UseDomainManagementFeatureProps,
  | 'canClearPrimary'
  | 'canSetPrimary'
  | 'displayName'
  | 'moonlightRecord'
  | 'onBackToDetails'
  | 'primaryEndpointValue'
  | 'primaryError'
  | 'primaryTxState'
  | 'primaryVerification'
  | 'selectedAddress'
  | 'setPrimaryEndpointValue'
  | 'setPrimaryError'
> & {
  handleClearPrimaryName: AsyncAction
  handleSetPrimaryName: AsyncAction
}

export function buildPrimaryProps({
  canClearPrimary,
  canSetPrimary,
  displayName,
  handleClearPrimaryName,
  handleSetPrimaryName,
  moonlightRecord,
  onBackToDetails,
  primaryEndpointValue,
  primaryError,
  primaryTxState,
  primaryVerification,
  selectedAddress,
  setPrimaryEndpointValue,
  setPrimaryError,
}: PrimaryPropsArgs): DomainManagementFeatureProps['primaryProps'] {
  return {
    canClearPrimary,
    canSetPrimary,
    displayName,
    error: primaryError,
    onBack: onBackToDetails,
    onClearPrimary: () => void handleClearPrimaryName(),
    onEndpointChange: (value) => {
      setPrimaryEndpointValue(value)
      setPrimaryError('')
    },
    onSetPrimary: () => void handleSetPrimaryName(),
    placeholder: selectedAddress || moonlightRecord?.value || 'dusk1...',
    primaryEndpointValue,
    primaryVerification,
    txState: primaryTxState,
  }
}
