type ReservationKey = { chainId: string; commitment: string }
const storageKey = ({ chainId, commitment }: ReservationKey) => `dusk-domains.claim-primary:${chainId}:${commitment}`

// The SDK stores the recovery secret; this browser preference travels alongside it.
// Older claims have no choice saved, so resuming must not replace an existing primary name.
export function readReservationPrimaryChoice(key: ReservationKey) {
  try { return globalThis.localStorage?.getItem(storageKey(key)) === 'true' } catch { return false }
}

export function saveReservationPrimaryChoice(key: ReservationKey, value: boolean) {
  try { globalThis.localStorage?.setItem(storageKey(key), String(value)) } catch { /* Recovery defaults to off. */ }
}

export function clearReservationPrimaryChoice(key: ReservationKey) {
  try { globalThis.localStorage?.removeItem(storageKey(key)) } catch { /* The reservation is already removed. */ }
}
