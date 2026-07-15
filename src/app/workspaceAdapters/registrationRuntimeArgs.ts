import type { UseRegistrationRuntimeArgs } from '../useRegistrationRuntime'
import type { AppCoreRuntimes } from '../useAppCoreRuntimes'
import type { NamePreview } from './types'

export function buildRegistrationRuntimeArgs({
  core,
  namePreview,
}: {
  core: AppCoreRuntimes
  namePreview: NamePreview
}): UseRegistrationRuntimeArgs {
  const {
    appRuntime,
    registrationState,
    searchState,
    walletRuntime,
  } = core

  return {
    canRegister: namePreview.canRegister,
    chainId: appRuntime.runtimeConfig.chainId,
    committed: registrationState.committed,
    getCurrentBlockHeight: appRuntime.getCurrentBlockHeight,
    indexerClient: appRuntime.indexerClient,
    mainView: searchState.mainView,
    preparedCommit: registrationState.preparedCommit,
    registerSetsPrimary: registrationState.registerSetsPrimary,
    registrationAddressInput: registrationState.registrationAddressInput,
    registrationStep: registrationState.registrationStep,
    selectedAddress: walletRuntime.selectedAddress,
    selectedAuthority: walletRuntime.selectedAuthority,
    setCurrentBlockHeight: searchState.setCurrentBlockHeight,
    setNowSeconds: searchState.setNowSeconds,
    setPreparedCommit: registrationState.setPreparedCommit,
    walletSetupState: walletRuntime.walletSetupState,
  }
}
