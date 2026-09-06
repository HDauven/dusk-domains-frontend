import type { DomainManagementFeatureProps, UseDomainManagementFeatureProps } from './domainManagementFeatureTypes'
import { buildDomainManagementProps } from './domainManagementProps'
import { useDomainManagementActionHandlers } from './useDomainManagementActionHandlers'

export function useDomainManagementFeature(props: UseDomainManagementFeatureProps): DomainManagementFeatureProps {
  return buildDomainManagementProps(props, useDomainManagementActionHandlers(props))
}
