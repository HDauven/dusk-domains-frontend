import { userFacingErrorMessage } from '../../names/internal'
import { guardDomainActionPrerequisite } from './domainActionGuards'
import type { UseSubdomainActionsProps } from './subdomainActionTypes'

export async function revokeSubdomain({
  canRevokeSelectedSubname,
  selectedAddress,
  selectedDelegatedSubname,
  setSubnameError,
  walletSetupState,
  ensureContractAuthorityForLiveWrite,
  ensurePublicBalanceForLiveWrite,
}: UseSubdomainActionsProps) {
  setSubnameError('')
  if (!guardDomainActionPrerequisite({
    canContinue: Boolean(canRevokeSelectedSubname && selectedAddress && selectedDelegatedSubname),
    setError: setSubnameError,
      walletSetupState,
    blockedCopy: 'Choose an active parent-revocable subdomain before revoking.',
  })) {
    return
  }
  if (!ensureContractAuthorityForLiveWrite('revoke this subdomain', setSubnameError)) return
  if (!(await ensurePublicBalanceForLiveWrite('revoking this subdomain', setSubnameError))) return

  try {
    throw new Error('Subdomain revocation is not exposed until it is implemented on Dusk Domains Core.')
  } catch (error) {
    setSubnameError(userFacingErrorMessage(error))
  }
}
