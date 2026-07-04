import type { AppViewModelInputs } from './appViewTypes'
import type { UseDomainManagementFeatureProps } from '../features/domains/domainManagementFeatureTypes'
import { buildDomainManagementCapabilityProps } from './domainManagementAdapter/capabilityProps'
import { buildDomainManagementContextProps } from './domainManagementAdapter/contextProps'
import { buildDomainRecordStateProps } from './domainManagementAdapter/recordStateProps'
import { buildDomainManagementStateProps } from './domainManagementAdapter/domainStateProps'

export function buildDomainManagementFeatureProps(
  inputs: AppViewModelInputs,
): UseDomainManagementFeatureProps {
  return {
    ...buildDomainManagementCapabilityProps(inputs),
    ...buildDomainManagementContextProps(inputs),
    ...buildDomainManagementStateProps(inputs),
    ...buildDomainRecordStateProps(inputs),
  }
}
