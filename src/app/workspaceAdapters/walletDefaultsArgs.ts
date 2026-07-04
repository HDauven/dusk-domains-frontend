import type { UseAppWalletDefaultsArgs } from '../useAppWalletDefaults'
import type { AppCoreRuntimes } from '../useAppCoreRuntimes'

export function buildWalletDefaultsArgs({
  domainState,
  registrationState,
  walletRuntime,
}: AppCoreRuntimes): UseAppWalletDefaultsArgs {
  return {
    selectedAddress: walletRuntime.selectedAddress,
    selectedAuthority: walletRuntime.selectedAuthority,
    setDelegateManager: domainState.setDelegateManager,
    setDraftManager: domainState.setDraftManager,
    setDraftOwner: domainState.setDraftOwner,
    setManagedName: domainState.setManagedName,
    setRegistrationAddressInput: registrationState.setRegistrationAddressInput,
    setSubnameManager: domainState.setSubnameManager,
    walletAuthorized: walletRuntime.walletSession.authorized,
  }
}
