import type { UseDomainSettingsActionsProps } from './domainSettingsActionTypes'
import { renewDomainName } from './renewDomainName'
import { updateDomainAuthorities } from './updateDomainAuthorities'

export function useDomainSettingsActions(props: UseDomainSettingsActionsProps) {
  return {
    handleOwnershipUpdate: () => updateDomainAuthorities(props),
    handleRenewName: () => renewDomainName(props),
  }
}
