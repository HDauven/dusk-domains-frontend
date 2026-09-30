import { describe, expect, it, vi } from 'vitest'
import type { DuskDomainsIndexerClient } from '../../names/internal'
import { indexedOwnCommitment, refreshCommitBlockStateFromIndexer } from './pendingReservationSync'
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
  it("asks the indexer for the controller's own commit", async () => {
    const controller = `0x${'11'.repeat(32)}`
    const own = { commitment: '0xcommit', controller, committedBlockHeight: 101, committedTxId: '0xtx' }
    const getCommitment = vi.fn(async () => own)
    const indexerClient = { getCommitment } as unknown as DuskDomainsIndexerClient

    await expect(indexedOwnCommitment(indexerClient, '0xcommit', controller)).resolves.toBe(own)
    expect(getCommitment).toHaveBeenLastCalledWith('0xcommit', controller)

    // An authority that is not 32-byte hex is not sent; no indexed commit can be its own.
    await expect(indexedOwnCommitment(indexerClient, '0xcommit', 'dusk1notahexauthority')).resolves.toBeNull()
    expect(getCommitment).toHaveBeenLastCalledWith('0xcommit', undefined)
  })

  it("ignores another account's commit of the same hash", async () => {
    let preparedCommit: PreparedRegistrationCommit | null = {
      commitment: '0xcommit',
      secret: 'secret',
      committedBlockHeight: 100,
      committedTxId: '0xtx',
    }
    // An indexer without the controller parameter returns the latest commit for the hash.
    const getCommitment = vi.fn(async () => ({
      commitment: '0xcommit',
      controller: `0x${'22'.repeat(32)}`,
      committedBlockHeight: 390,
      committedTxId: '0xcopy',
    }))
    const indexerClient = {
      getHealth: async () => ({ currentBlockHeight: 400, cursor: null, checkpoint: null }),
      getCommitment,
    } as unknown as DuskDomainsIndexerClient

    const indexed = await refreshCommitBlockStateFromIndexer({
      chainId: 'dusk:2',
      commitment: '0xcommit',
      getCurrentBlockHeight: async () => 400,
      indexerClient,
      loadPendingReservations: () => [],
      selectedAuthority: `0x${'11'.repeat(32)}`,
      setCurrentBlockHeight: () => {},
      setPreparedCommit: (updater) => {
        preparedCommit = typeof updater === 'function' ? updater(preparedCommit) : updater
      },
    })

    expect(indexed).toBe(false)
    expect(getCommitment).toHaveBeenCalledWith('0xcommit', `0x${'11'.repeat(32)}`)
    expect(preparedCommit).toMatchObject({ committedBlockHeight: 100, committedTxId: '0xtx' })
  })
})
