import { userFacingErrorMessage } from '../../names/internal'
import { guardDomainActionPrerequisite } from './domainActionGuards'
import type { UseDomainSettingsActionsProps } from './domainSettingsActionTypes'

export async function updateDomainResolver({
  canManageName,
  setManagementError,
  walletSetupState,
  ensureContractAuthorityForLiveWrite,
  ensurePublicBalanceForLiveWrite,
}: UseDomainSettingsActionsProps) {
  setManagementError('')
  if (!guardDomainActionPrerequisite({
    canContinue: canManageName,
    setError: setManagementError,
      walletSetupState,
    blockedCopy: 'Confirm the exact name and connect the owner wallet before changing resolver.',
  })) {
    return
  }
  if (!ensureContractAuthorityForLiveWrite('update the resolver', setManagementError)) return
  if (!(await ensurePublicBalanceForLiveWrite('updating the resolver', setManagementError))) return

  try {
    throw new Error('Record source updates now go through Dusk Domains Core and are not exposed in this view yet.')
  } catch (error) {
    setManagementError(userFacingErrorMessage(error))
  }
}
