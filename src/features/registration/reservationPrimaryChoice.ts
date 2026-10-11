type ReservationKey = { chainId: string; commitment: string }
const storageKey = ({ chainId, commitment }: ReservationKey) => `dusk-domains.claim-primary:${chainId}:${commitment}`

// The SDK stores the recovery secret; this browser preference travels alongside it. Only a choice the
// person made is saved. Without one, Register follows the wallet's primary name as it is then.
// Earlier versions saved the switch as "true" or "false", including its default, which was on: "true"
// may never have been chosen, so it counts as no choice, while "false" was always turned off.
export function readReservationPrimaryChoice(key: ReservationKey): boolean | null {
  try {
    const saved = globalThis.localStorage?.getItem(storageKey(key))
    return saved === 'on' ? true : saved === 'off' || saved === 'false' ? false : null
  } catch { return null }
}

export function saveReservationPrimaryChoice(key: ReservationKey, value: boolean | null) {
  try {
    if (typeof value === 'boolean') globalThis.localStorage?.setItem(storageKey(key), value ? 'on' : 'off')
    else globalThis.localStorage?.removeItem(storageKey(key))
  } catch { /* Recovery then follows the wallet's primary name. */ }
}

export function clearReservationPrimaryChoice(key: ReservationKey) {
  try { globalThis.localStorage?.removeItem(storageKey(key)) } catch { /* The reservation is already removed. */ }
}
