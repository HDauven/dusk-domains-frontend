import type { Dispatch, SetStateAction } from 'react'
import type { DuskDomainsIndexerClient } from '../../names/internal'
import type { CurrentBlockHeightReader } from '../../app/duskNodeHeight'

export type PreparedRegistrationCommit = {
  directory?: string
  commitmentStore?: string
  controller: string
  ownerAddress: string
  chainId: string
  commitment: string
  secret: string
  committedBlockHeight: number | null
  committedTxId: string | null
}

// On chain a commitment is kept per controller, so a stranded one names both.
export type StrandedCommitment = {
  controller: string
  commitment: string
}

export type UsePendingReservationsArgs = {
  explicitlyDisconnected?: boolean
  directory?: string
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

export function registrationCommitMatchesSession(commit: PreparedRegistrationCommit | null, controller: string, ownerAddress: string, chainId: string) {
  return Boolean(commit && controller && ownerAddress && chainId
    && commit.controller === controller && commit.ownerAddress === ownerAddress && commit.chainId === chainId)
}
