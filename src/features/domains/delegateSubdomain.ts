import { contractPrincipalInput } from '../../app/appHelpers'
import { userFacingErrorMessage } from '../../names/internal'
import { guardDomainActionPrerequisite } from './domainActionGuards'
import type { UseSubdomainActionsProps } from './subdomainActionTypes'

export async function delegateSubdomain({
  canDelegateSubname,
  delegateManager,
  selectedAddress,
  selectedDelegatedSubname,
  setSubnameError,
  walletSetupState,
  ensureContractAuthorityForLiveWrite,
  ensurePublicBalanceForLiveWrite,
}: UseSubdomainActionsProps) {
  setSubnameError('')
  if (!guardDomainActionPrerequisite({
    canContinue: Boolean(canDelegateSubname && selectedAddress && selectedDelegatedSubname),
    setError: setSubnameError,
      walletSetupState,
    blockedCopy: 'Choose an active subdomain and enter the new manager before delegating.',
  })) {
    return
  }
  if (!ensureContractAuthorityForLiveWrite('delegate this subdomain', setSubnameError)) return
  if (!(await ensurePublicBalanceForLiveWrite('delegating this subdomain', setSubnameError))) return

  try {
    const nextManager = contractPrincipalInput(delegateManager, 'Subdomain manager')
    void nextManager
    throw new Error('Subdomain delegation is not exposed until it is implemented on Dusk Domains Core.')
  } catch (error) {
    setSubnameError(userFacingErrorMessage(error))
  }
}
