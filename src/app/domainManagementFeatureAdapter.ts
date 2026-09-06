import type { AppViewModelInputs } from './appViewTypes'
import type { UseDomainManagementFeatureProps } from '../features/domains/domainManagementFeatureTypes'
import { buildDomainManagementContextProps } from './domainManagementAdapter/contextProps'

export function buildDomainManagementFeatureProps(
  inputs: AppViewModelInputs,
): UseDomainManagementFeatureProps {
  return {
    ...inputs.derivedState,
    ...buildDomainManagementContextProps(inputs),
    ...inputs.domainState,
    ...inputs.domainRecordState,
  }
}
