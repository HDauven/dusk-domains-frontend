import * as sdk from '@duskdomains/sdk'

/**
 * The price a reservation was reviewed at and the policy selection that quoted it. A governance
 * SetPolicy keeps a reservation's secret and age valid but not its price (spec §6.2), so Register
 * compares a fresh quote with this. Plain strings, so it can be kept with the saved reservation.
 */
export type ReviewedRegistrationQuote = {
  years: number
  totalLux: string
  /** The policy contract, lowercase hex without a prefix. */
  policy: string
  policyVersion: string
  configVersion: string
}

export function reviewedRegistrationQuote(quote: sdk.RegistrationQuote, years: number): ReviewedRegistrationQuote {
  return {
    years,
    totalLux: String(quote.total_lux),
    policy: sdk.hex(quote.policy),
    policyVersion: String(quote.policy_version),
    configVersion: String(quote.quote.config_version),
  }
}

export function isReviewedRegistrationQuote(value: unknown): value is ReviewedRegistrationQuote {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return Number.isInteger(v.years) && (v.years as number) >= 1 && (v.years as number) <= 10
    && typeof v.totalLux === 'string' && /^(0|[1-9]\d*)$/.test(v.totalLux)
    && typeof v.policy === 'string' && /^[0-9a-f]{64}$/.test(v.policy)
    && typeof v.policyVersion === 'string' && /^[1-9]\d*$/.test(v.policyVersion)
    && typeof v.configVersion === 'string' && /^[1-9]\d*$/.test(v.configVersion)
}

/** Whether `quote` comes from another policy selection or configuration than the reviewed one. */
export function registrationPolicyChanged(reviewed: ReviewedRegistrationQuote, quote: sdk.RegistrationQuote) {
  return reviewed.policy !== sdk.hex(quote.policy)
    || reviewed.policyVersion !== String(quote.policy_version)
    || reviewed.configVersion !== String(quote.quote.config_version)
}

/** Whether two quotes differ in what the person pays or in the policy that set it. The observation height may differ. */
export function registrationQuoteBindingsDiffer(a: sdk.RegistrationQuote, b: sdk.RegistrationQuote) {
  return BigInt(a.total_lux) !== BigInt(b.total_lux)
    || a.policy_version !== b.policy_version
    || a.quote.config_version !== b.quote.config_version
    || sdk.hex(a.policy) !== sdk.hex(b.policy)
}

export type RegistrationPriceChange = {
  /** The price the person last saw: what the reservation was priced at, or what Register showed. */
  previousTotalLux: string
  /** True when the policy selection changed since the reservation was priced. */
  sinceReservation: boolean
  /** The fresh SDK quote under the current policy, for the same name, term and actor. */
  quote: sdk.RegistrationQuote
}

/** A fresh quote no longer matches the reviewed price or policy. The reservation itself stays valid. */
export class RegistrationPriceChangedError extends Error {
  readonly change: RegistrationPriceChange
  constructor(change: RegistrationPriceChange) {
    super('The registration price changed. Your reservation is still valid: check the new price, then register.')
    this.name = 'RegistrationPriceChangedError'
    this.change = change
  }
}

/** The price change a failed write carries from preparation, if any. */
export function registrationPriceChange(error: unknown): RegistrationPriceChange | null {
  if (!(error instanceof Error) || error.name !== 'RegistrationPriceChangedError' || !('change' in error)) return null
  const change = (error as { change?: Partial<RegistrationPriceChange> }).change
  return change && typeof change.previousTotalLux === 'string' && change.quote ? change as RegistrationPriceChange : null
}

/** The chain refused a registration whose signed policy versions or fee no longer matched (spec §2.4). */
export function isRegistrationQuoteRefusal(text: string | undefined) {
  return /\b(QuoteChanged|FeeMismatch)\b/.test(String(text ?? ''))
}

/** Whether a fresh quote can be registered by the public: open, and the label still Public. */
export function registrableQuote(quote: sdk.RegistrationQuote) {
  return quote.quote.registration_open && quote.quote.label_status === 'Public'
}

/** Why a quote cannot be registered, in the words the claim shows. Empty when it can be. */
export function registrationQuoteBlockedReason(quote: sdk.RegistrationQuote) {
  if (!quote.quote.registration_open) return 'Registration is closed right now. Try again later.'
  if (quote.quote.label_status === 'Reserved') return 'This name is reserved under the current registration rules.'
  if (quote.quote.label_status === 'Denied') return 'This name can’t be registered under the current registration rules.'
  return ''
}
