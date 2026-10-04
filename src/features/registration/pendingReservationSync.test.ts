import { afterEach, describe, expect, it, vi } from 'vitest'
import { listPendingNameReservations, upsertPendingNameReservation, type DuskDomainsIndexerClient } from '../../names/internal'
import { indexedOwnCommitment, refreshCommitBlockStateFromIndexer, refreshPendingReservationsFromIndexer } from './pendingReservationSync'
import type { PreparedRegistrationCommit } from './pendingReservationTypes'

afterEach(() => vi.unstubAllGlobals())
it('removes completed saved claims while preserving available names and uncertain reads', async () => {
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) })
  for (const name of ['registered', 'available', 'offline']) {
    upsertPendingNameReservation({ name: `${name}.dusk`, node: name, commitment: name, secret: 'secret',
      controller: 'owner', ownerAddress: 'address', chainId: 'local', durationYears: 1,
      committedBlockHeight: 100, committedTxId: 'tx', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' })
  }
  await refreshPendingReservationsFromIndexer({
    indexerClient: {
      getHealth: async () => ({ currentBlockHeight: 110 }), getCommitment: async () => null,
      searchName: async (name: string) => { if (name === 'offline.dusk') throw new Error('offline'); return { status: name.split('.')[0] } },
    } as unknown as DuskDomainsIndexerClient,
    pendingReservations: listPendingNameReservations(), loadPendingReservations: () => listPendingNameReservations(),
    getCurrentBlockHeight: async () => 110, setCurrentBlockHeight: vi.fn(), setNowSeconds: vi.fn(),
  })
  expect(listPendingNameReservations().map(item => item.name).sort()).toEqual(['available.dusk', 'offline.dusk'])
})

describe('pending reservation block sync', () => {
  it('uses node height when indexer health has no live block height', async () => {
    let currentBlockHeight: number | null = null
    let preparedCommit: PreparedRegistrationCommit | null = {
      controller: 'owner', ownerAddress: 'wallet', chainId: 'dusk:0',
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
      controller: 'owner', ownerAddress: 'wallet', chainId: 'dusk:0',
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
      controller: 'owner', ownerAddress: 'wallet', chainId: 'dusk:0',
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
      controller: 'owner', ownerAddress: 'wallet', chainId: 'dusk:0',
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
