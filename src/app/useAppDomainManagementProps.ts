import { buildDomainManagementFeatureProps } from './domainManagementFeatureAdapter'
import { useDomainManagementFeature } from '../features/domains/useDomainManagementFeature'
import type { AppViewModelInputs } from './appViewTypes'

export function useAppDomainManagementProps(inputs: AppViewModelInputs) {
  return useDomainManagementFeature(buildDomainManagementFeatureProps(inputs))
}
