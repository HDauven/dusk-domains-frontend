import type { Dispatch, SetStateAction } from 'react'
import type { DuskNamesIndexerClient } from '../../names/internal'

export type PreparedRegistrationCommit = {
  commitment: string
  secret: string
  committedBlockHeight: number | null
  committedTxId: string | null
}

export type UsePendingReservationsArgs = {
  chainId: string
  currentCommitment: string
  indexerClient: DuskNamesIndexerClient | null
  refreshListView: boolean
  selectedAuthority: string
  setCurrentBlockHeight: (height: number | null) => void
  setNowSeconds: (seconds: number) => void
  setPreparedCommit: Dispatch<SetStateAction<PreparedRegistrationCommit | null>>
}
