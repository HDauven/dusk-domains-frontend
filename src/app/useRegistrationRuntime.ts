import type { Dispatch, SetStateAction } from 'react'
import type { DuskDomainsIndexerClient } from '../names/internal'
import type { CurrentBlockHeightReader } from './duskNodeHeight'
import type { AppMainView } from './AppTypes'
import { usePendingReservations, type PreparedRegistrationCommit } from '../features/registration/usePendingReservations'
import { useRegistrationFlowState } from '../features/registration/useRegistrationFlowState'

export type UseRegistrationRuntimeArgs = {
  chainId: string
  getCurrentBlockHeight: CurrentBlockHeightReader
  indexerClient: DuskDomainsIndexerClient | null
  mainView: AppMainView
  preparedCommit: PreparedRegistrationCommit | null
  selectedAddress: string
  selectedAuthority: string
  setCurrentBlockHeight: Dispatch<SetStateAction<number | null>>
  setNowSeconds: Dispatch<SetStateAction<number>>
  setPreparedCommit: Dispatch<SetStateAction<PreparedRegistrationCommit | null>>
}

export function useRegistrationRuntime({
  chainId,
  getCurrentBlockHeight,
  indexerClient,
  mainView,
  preparedCommit,
  selectedAddress,
  selectedAuthority,
  setCurrentBlockHeight,
  setNowSeconds,
  setPreparedCommit,
}: UseRegistrationRuntimeArgs) {
  const flowState = useRegistrationFlowState({
    selectedAddress,
  })

  const pendingState = usePendingReservations({
    chainId,
    currentCommitment: preparedCommit?.commitment ?? '',
    getCurrentBlockHeight,
    indexerClient,
    refreshListView: mainView === 'my-names' || mainView === 'search',
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
