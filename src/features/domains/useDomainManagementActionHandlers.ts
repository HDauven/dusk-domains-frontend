import type { UseDomainManagementFeatureProps } from './domainManagementFeatureTypes'
import { useDomainRecordActions } from './useDomainRecordActions'
import { useDomainSettingsActions } from './useDomainSettingsActions'
import { usePrimaryDomainActions } from './usePrimaryDomainActions'
import { useSubdomainActions } from './useSubdomainActions'

export function useDomainManagementActionHandlers(props: UseDomainManagementFeatureProps) {
  return {
    ...usePrimaryDomainActions(props),
    ...useDomainRecordActions(props),
    ...useDomainSettingsActions(props),
    ...useSubdomainActions({
      ...props,
      managedNameExpiresAt: props.managedName.expiresAt,
    }),
  }
}
