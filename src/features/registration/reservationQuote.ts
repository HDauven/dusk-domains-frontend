import type { RegistrationQuote } from '@duskdomains/sdk'
import { isReviewedRegistrationQuote, type ReviewedRegistrationQuote } from '../../names/internal'

type ReservationKey = { chainId: string; commitment: string }
const storageKey = ({ chainId, commitment }: ReservationKey) => `dusk-domains.claim-quote:${chainId}:${commitment.toLowerCase()}`

// The SDK stores the recovery secret; the price the reservation was made at travels alongside it, so
// Register can name the old and new price after a policy replacement. Confirming a new price replaces
// it. Without a saved price, Register compares a fresh quote only with the price it shows.
export function readReservationQuote(key: ReservationKey): ReviewedRegistrationQuote | null {
  try {
    const saved = globalThis.localStorage?.getItem(storageKey(key))
    if (!saved) return null
    const value: unknown = JSON.parse(saved)
    return isReviewedRegistrationQuote(value) ? value : null
  } catch { return null }
}

export function saveReservationQuote(key: ReservationKey, quote: ReviewedRegistrationQuote | null) {
  try {
    if (quote) globalThis.localStorage?.setItem(storageKey(key), JSON.stringify(quote))
    else globalThis.localStorage?.removeItem(storageKey(key))
  } catch { /* Register then compares a fresh quote with the price it shows. */ }
}

export function clearReservationQuote(key: ReservationKey) {
  try { globalThis.localStorage?.removeItem(storageKey(key)) } catch { /* The reservation is already removed. */ }
}

/**
 * A registration price that changed after the claim showed or reserved it, waiting for the person to
 * confirm the new price. The reservation stays valid; Register at the new price reveals it as it is.
 */
export type RegistrationPriceReview = {
  commitment: string
  /** The price last seen: what the reservation was made at, or what Register showed or signed. */
  previousLux: number | null
  /** The fresh SDK quote under the current policy. */
  quote: RegistrationQuote
  sinceReservation: boolean
  /** The chain refused the signed registration (QuoteChanged or FeeMismatch) and returned its payment. */
  refused: boolean
}
