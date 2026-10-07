import * as sdk from '@duskdomains/sdk'
import { safeNumber } from './numbers'
export type PendingNameReservation = Omit<sdk.PendingNameReservation, 'committedBlockHeight'> & {
  committedBlockHeight: number | null
  ownerAddress: string
}
export const REGISTRATION_MIN_REVEAL_WAIT_BLOCKS = Number(sdk.REGISTRATION_MIN_REVEAL_WAIT_BLOCKS)
export const REGISTRATION_MAX_COMMITMENT_AGE_BLOCKS = Number(sdk.REGISTRATION_MAX_COMMITMENT_AGE_BLOCKS)
export const MAX_PENDING_COMMITMENTS_PER_CONTROLLER = sdk.MAX_PENDING_COMMITMENTS_PER_CONTROLLER
export function registrationCommitWindow(
  committed: number | null | undefined,
  current: number | null | undefined,
) {
  const value = sdk.registrationCommitWindow(
    committed == null ? null : BigInt(committed),
    current == null ? null : BigInt(current),
  )
  return {
    ...value,
    waitBlocks: safeNumber(value.waitBlocks),
    staleInBlocks: safeNumber(value.staleInBlocks),
  }
}
const addressKey = (r: { chainId: string; controller: string }) =>
  `dusk-domains:reservation-address:${r.chainId}:${r.controller.toLowerCase()}`
function view(row: sdk.PendingNameReservation, storage: sdk.ReservationStorage): PendingNameReservation {
  return {
    ...row,
    committedBlockHeight: row.committedBlockHeight === null ? null : safeNumber(row.committedBlockHeight),
    ownerAddress: storage.getItem(addressKey(row)) ?? '',
  }
}
export function listPendingNameReservations(
  filter: sdk.PendingNameReservationFilter = {},
  storage = globalThis.localStorage,
): PendingNameReservation[] {
  try {
    return sdk.listPendingNameReservations(filter, storage).map((row) => view(row, storage))
  } catch {
    return []
  }
}
export function upsertPendingNameReservation(
  row: PendingNameReservation,
  storage = globalThis.localStorage,
): PendingNameReservation[] {
  storage.setItem(addressKey(row), row.ownerAddress)
  return sdk
    .upsertPendingNameReservation(
      {
        ...row,
        committedBlockHeight: row.committedBlockHeight === null ? null : BigInt(row.committedBlockHeight),
      },
      storage,
    )
    .map((r) => view(r, storage))
}
// Incomplete application keys may only resolve to one persisted, deployment-bound entry.
function fullKey(
  key: Pick<sdk.PendingNameReservationKey, 'chainId' | 'controller' | 'commitment'> &
    Partial<sdk.PendingNameReservationKey>,
  storage: sdk.ReservationStorage,
) {
  const matches = sdk
    .listPendingNameReservations(key, storage)
    .filter((r) => r.commitment.toLowerCase() === key.commitment.toLowerCase())
  if (matches.length !== 1)
    throw new Error('Reservation is missing or ambiguous. Open the saved reservation for this deployment.')
  return matches[0]
}
export function removePendingNameReservation(
  key: Parameters<typeof fullKey>[0],
  storage = globalThis.localStorage,
) {
  const rows = sdk
    .listPendingNameReservations(key, storage)
    .filter((r) => r.commitment.toLowerCase() === key.commitment.toLowerCase())
  if (!rows.length) return listPendingNameReservations({}, storage)
  return sdk.removePendingNameReservation(fullKey(key, storage), storage).map((r) => view(r, storage))
}
export function updatePendingNameReservationBlock(
  key: Parameters<typeof fullKey>[0],
  update: { committedBlockHeight: number | null; committedTxId?: string | null },
  storage = globalThis.localStorage,
) {
  const saved = fullKey(key, storage)
  return sdk
    .updatePendingNameReservationBlock(
      saved,
      {
        ...update,
        committedBlockHeight:
          update.committedBlockHeight === null ? null : BigInt(update.committedBlockHeight),
        committedTxId: update.committedTxId ?? null,
      },
      storage,
    )
    .map((r) => view(r, storage))
}

export type RegistrationCommitWindow = ReturnType<typeof registrationCommitWindow>
