import { describe, expect, it } from 'vitest'
import type { PendingNameReservation } from '../../names/internal'
import { inferredCommittedBlockHeightFromReservation } from './pendingReservationBlockRecovery'

const oldReservation: PendingNameReservation = {
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
}

describe('pending reservation block recovery', () => {
  it('infers a conservative committed block for old confirmed reservations', () => {
    expect(inferredCommittedBlockHeightFromReservation(
      oldReservation,
      3718500,
      Date.parse('2026-07-05T22:02:00.000Z'),
    )).toBe(3718495)
  })

  it('does not infer immediately after a reserve transaction', () => {
    expect(inferredCommittedBlockHeightFromReservation(
      oldReservation,
      3718500,
      Date.parse('2026-07-05T22:00:30.000Z'),
    )).toBeNull()
  })

  it('does not infer without a tx id or current block height', () => {
    expect(inferredCommittedBlockHeightFromReservation({
      ...oldReservation,
      committedTxId: null,
    }, 3718500, Date.parse('2026-07-05T22:02:00.000Z'))).toBeNull()
    expect(inferredCommittedBlockHeightFromReservation(
      oldReservation,
      null,
      Date.parse('2026-07-05T22:02:00.000Z'),
    )).toBeNull()
  })
})
