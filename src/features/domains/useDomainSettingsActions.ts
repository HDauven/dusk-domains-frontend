import type { UseDomainSettingsActionsProps } from './domainSettingsActionTypes'
import { renewDomainName } from './renewDomainName'
import { updateDomainAuthorities } from './updateDomainAuthorities'

export function useDomainSettingsActions(props: UseDomainSettingsActionsProps) {
  return {
    handleOwnershipUpdate: (change: Parameters<typeof updateDomainAuthorities>[1]) => updateDomainAuthorities(props, change),
    handleRenewName: () => renewDomainName(props),
  }
}
