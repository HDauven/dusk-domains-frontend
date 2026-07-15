import type { Dispatch, SetStateAction } from 'react'
import type { DuskDomainsIndexerClient } from '../../names/internal'
import type { CurrentBlockHeightReader } from '../../app/duskNodeHeight'

export type PreparedRegistrationCommit = {
  commitment: string
  secret: string
  committedBlockHeight: number | null
  committedTxId: string | null
}

export type UsePendingReservationsArgs = {
  chainId: string
  currentCommitment: string
  getCurrentBlockHeight: CurrentBlockHeightReader
  indexerClient: DuskDomainsIndexerClient | null
  refreshListView: boolean
  selectedAuthority: string
  setCurrentBlockHeight: (height: number | null) => void
  setNowSeconds: (seconds: number) => void
  setPreparedCommit: Dispatch<SetStateAction<PreparedRegistrationCommit | null>>
}
