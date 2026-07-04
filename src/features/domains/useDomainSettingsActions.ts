import type { UseDomainSettingsActionsProps } from './domainSettingsActionTypes'
import { renewDomainName } from './renewDomainName'
import { updateDomainAuthorities } from './updateDomainAuthorities'
import { updateDomainResolver } from './updateDomainResolver'

export function useDomainSettingsActions(props: UseDomainSettingsActionsProps) {
  return {
    handleOwnershipUpdate: () => updateDomainAuthorities(props),
    handleRenewName: () => renewDomainName(props),
    handleResolverUpdate: () => updateDomainResolver(props),
  }
}
