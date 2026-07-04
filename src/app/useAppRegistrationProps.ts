import { buildRegistrationFeatureProps } from './registrationFeatureAdapter'
import { useRegistrationFeature } from '../features/registration/useRegistrationFeature'
import type { AppViewModelInputs } from './appViewTypes'

export function useAppRegistrationProps(inputs: AppViewModelInputs) {
  return useRegistrationFeature(buildRegistrationFeatureProps(inputs))
}
