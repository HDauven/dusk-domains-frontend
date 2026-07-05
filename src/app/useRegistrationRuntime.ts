import type { Dispatch, SetStateAction } from 'react'
import type { DuskDomainsIndexerClient } from '../names/internal'
import type { AppMainView } from './AppTypes'
import { usePendingReservations, type PreparedRegistrationCommit } from '../features/registration/usePendingReservations'
import { useRegistrationFlowState } from '../features/registration/useRegistrationFlowState'
import type { RegistrationStepId } from '../features/registration/registrationSteps'
import type { WalletConnectionStatus } from '../features/wallet/walletStatus'

export type UseRegistrationRuntimeArgs = {
  canRegister: boolean
  chainId: string
  committed: boolean
  indexerClient: DuskDomainsIndexerClient | null
  mainView: AppMainView
  preparedCommit: PreparedRegistrationCommit | null
  registerSetsPrimary: boolean
  registrationAddressInput: string
  registrationStep: RegistrationStepId
  selectedAddress: string
  selectedAuthority: string
  setCurrentBlockHeight: Dispatch<SetStateAction<number | null>>
  setNowSeconds: Dispatch<SetStateAction<number>>
  setPreparedCommit: Dispatch<SetStateAction<PreparedRegistrationCommit | null>>
  walletSetupState: WalletConnectionStatus
}

export function useRegistrationRuntime({
  canRegister,
  chainId,
  committed,
  indexerClient,
  mainView,
  preparedCommit,
  registerSetsPrimary,
  registrationAddressInput,
  registrationStep,
  selectedAddress,
  selectedAuthority,
  setCurrentBlockHeight,
  setNowSeconds,
  setPreparedCommit,
  walletSetupState,
}: UseRegistrationRuntimeArgs) {
  const flowState = useRegistrationFlowState({
    canRegister,
    committed,
    registerSetsPrimary,
    registrationAddressInput,
    registrationStep,
    selectedAddress,
    walletSetupState,
  })

  const pendingState = usePendingReservations({
    chainId,
    currentCommitment: preparedCommit?.commitment ?? '',
    indexerClient,
    refreshListView: mainView === 'my-names',
    selectedAuthority,
    setCurrentBlockHeight,
    setNowSeconds,
    setPreparedCommit,
  })

  return {
    ...flowState,
    ...pendingState,
  }
}
