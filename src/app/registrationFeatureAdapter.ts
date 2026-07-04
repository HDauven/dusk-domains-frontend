import type { AppViewModelInputs } from './appViewTypes'
import type { UseRegistrationFeatureProps } from '../features/registration/useRegistrationFeature'
import { buildRegistrationPreviewProps } from './registrationAdapter/previewProps'
import { buildRegistrationRuntimeProps } from './registrationAdapter/runtimeProps'
import { buildRegistrationStateProps } from './registrationAdapter/stateProps'
import { buildRegistrationWalletProps } from './registrationAdapter/walletProps'

export function buildRegistrationFeatureProps(
  inputs: AppViewModelInputs,
): UseRegistrationFeatureProps {
  return {
    ...buildRegistrationPreviewProps(inputs),
    ...buildRegistrationRuntimeProps(inputs),
    ...buildRegistrationStateProps(inputs),
    ...buildRegistrationWalletProps(inputs),
  }
}
