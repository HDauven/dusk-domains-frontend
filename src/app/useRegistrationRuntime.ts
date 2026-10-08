import type { Dispatch, SetStateAction } from 'react'
import type { DuskDomainsIndexerClient } from '../names/internal'
import type { CurrentBlockHeightReader } from './duskNodeHeight'
import type { AppMainView } from './AppTypes'
import { usePendingReservations, type PreparedRegistrationCommit } from '../features/registration/usePendingReservations'
import { useRegistrationFlowState } from '../features/registration/useRegistrationFlowState'

export type UseRegistrationRuntimeArgs = {
  explicitlyDisconnected?: boolean
  directory?: string
  chainId: string
  currentBlockHeight: number | null
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
  explicitlyDisconnected,
  chainId,
  directory,
  currentBlockHeight,
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
    explicitlyDisconnected,
    chainId,
  directory,
    currentCommitment: preparedCommit?.commitment ?? '',
    committedBlockHeight: preparedCommit?.committedBlockHeight ?? null,
    currentBlockHeight,
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
