import { describe, expect, it } from 'vitest'
import type { DuskDomainsIndexerClient } from '../../names/internal'
import { refreshCommitBlockStateFromIndexer } from './pendingReservationSync'
import type { PreparedRegistrationCommit } from './pendingReservationTypes'

describe('pending reservation block sync', () => {
  it('uses node height when indexer health has no live block height', async () => {
    let currentBlockHeight: number | null = null
    let preparedCommit: PreparedRegistrationCommit | null = {
      commitment: '0xcommit',
      secret: 'secret',
      committedBlockHeight: 100,
      committedTxId: '0xtx',
    }
    const indexerClient = {
      getHealth: async () => ({
        currentBlockHeight: null,
        cursor: null,
        checkpoint: null,
      }),
      getCommitment: async () => null,
    } as unknown as DuskDomainsIndexerClient

    const indexed = await refreshCommitBlockStateFromIndexer({
      chainId: 'dusk:2',
      commitment: '0xcommit',
      getCurrentBlockHeight: async () => 106,
      indexerClient,
      loadPendingReservations: () => [],
      selectedAuthority: '',
      setCurrentBlockHeight: (height) => {
        currentBlockHeight = height
      },
      setPreparedCommit: (updater) => {
        preparedCommit = typeof updater === 'function' ? updater(preparedCommit) : updater
      },
    })

    expect(indexed).toBe(false)
    expect(currentBlockHeight).toBe(106)
    expect(preparedCommit?.committedBlockHeight).toBe(100)
  })

  it('recovers old saved reservations that have a tx id but no indexed block', async () => {
    let currentBlockHeight: number | null = null
    let preparedCommit: PreparedRegistrationCommit | null = {
      commitment: '0xcommit',
      secret: 'secret',
      committedBlockHeight: null,
      committedTxId: '0xtx',
    }
    const indexerClient = {
      getHealth: async () => ({
        currentBlockHeight: null,
        cursor: null,
        checkpoint: null,
      }),
      getCommitment: async () => null,
    } as unknown as DuskDomainsIndexerClient

    const indexed = await refreshCommitBlockStateFromIndexer({
      chainId: 'dusk:2',
      commitment: '0xcommit',
      getCurrentBlockHeight: async () => 120,
      indexerClient,
      loadPendingReservations: () => [{
        name: 'aurora.dusk',
        node: '0xnode',
        commitment: '0xcommit',
        secret: 'secret',
        controller: '0xcontroller',
        ownerAddress: 'owner',
        chainId: 'dusk:2',
        durationYears: 1,
        committedBlockHeight: null,
        committedTxId: '0xtx',
        createdAt: '2026-07-05T22:00:00.000Z',
        updatedAt: '2026-07-05T22:00:00.000Z',
      }],
      selectedAuthority: '',
      setCurrentBlockHeight: (height) => {
        currentBlockHeight = height
      },
      setPreparedCommit: (updater) => {
        preparedCommit = typeof updater === 'function' ? updater(preparedCommit) : updater
      },
    })

    expect(indexed).toBe(false)
    expect(currentBlockHeight).toBe(120)
    expect(preparedCommit).toMatchObject({
      committedBlockHeight: 115,
      committedTxId: '0xtx',
    })
  })

  it('updates the saved committed block when the indexer catches up', async () => {
    let currentBlockHeight: number | null = null
    let preparedCommit: PreparedRegistrationCommit | null = {
      commitment: '0xcommit',
      secret: 'secret',
      committedBlockHeight: null,
      committedTxId: null,
    }
    const indexerClient = {
      getHealth: async () => ({
        currentBlockHeight: null,
        cursor: null,
        checkpoint: null,
      }),
      getCommitment: async () => ({
        commitment: '0xcommit',
        committedBlockHeight: 101,
        committedTxId: '0xindexed',
      }),
    } as unknown as DuskDomainsIndexerClient

    const indexed = await refreshCommitBlockStateFromIndexer({
      chainId: 'dusk:2',
      commitment: '0xcommit',
      getCurrentBlockHeight: async () => 107,
      indexerClient,
      loadPendingReservations: () => [],
      selectedAuthority: '',
      setCurrentBlockHeight: (height) => {
        currentBlockHeight = height
      },
      setPreparedCommit: (updater) => {
        preparedCommit = typeof updater === 'function' ? updater(preparedCommit) : updater
      },
    })

    expect(indexed).toBe(true)
    expect(currentBlockHeight).toBe(107)
    expect(preparedCommit).toMatchObject({
      committedBlockHeight: 101,
      committedTxId: '0xindexed',
    })
  })
})
