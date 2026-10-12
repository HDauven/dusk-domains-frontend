import type { WebsiteVerification } from '../http/verification'
import {
  validateName as validate,
  analyzeName as analyze,
  RESERVED_LABELS,
  launchPolicyConfig,
  registrationPremiumSchedule as premium,
  normalizeNameInput,
} from '@duskdomains/sdk'
import { safeNumber } from '../numbers'
import { unicodeInputError } from '../unicode'
export { normalizeNameInput } from '@duskdomains/sdk'
export const LUX_PER_DUSK = 1_000_000_000
const policy = launchPolicyConfig()
export const DEFAULT_FEE_CONFIG: CoreFeeConfig = {
  threeCharYearLux: Number(policy.annual_lux[2]),
  fourCharYearLux: Number(policy.annual_lux[3]),
  fivePlusYearLux: Number(policy.annual_lux[4]),
  referralRewardBps: policy.base_referral_bps,
  renewalReferralRewardBps: 1000,
  premiumStartLux: Number(policy.premium_start_lux),
  premiumReferralRewardBps: policy.premium_referral_bps,
  version: 1,
  updatedAt: 0,
}
export type NameStatus = 'available' | 'registered' | 'reserved' | 'invalid'

export type SearchIssue = {
  tone: 'danger' | 'warning' | 'info'
  text: string
}

export type NameResult = {
  verification?: WebsiteVerification
  policyQuote?: import('@duskdomains/sdk').RegistrationQuote
  totalFeeLux?: number
  quotedYears?: number
  canonical: string
  canonicalRaw: string
  displayName: string
  label: string
  status: NameStatus
  /** The indexer's yearly estimate; null while it withholds the prices of a policy it has not verified. */
  price: number | null
  issues: SearchIssue[]
  transactionBlocked: boolean
  premiumLux?: number
  premiumEndsAt?: string | null
  premiumEndsAtBlockHeight?: number | null
  premiumNextStepAt?: string | null
  premiumNextStepBlockHeight?: number | null
  graceEndsAtBlockHeight?: number | null
  reserved?: ReservedNamePolicy
}

export type CoreFeeConfig = {
  threeCharYearLux: number
  fourCharYearLux: number
  fivePlusYearLux: number
  referralRewardBps: number
  renewalReferralRewardBps: number
  premiumStartLux: number
  premiumReferralRewardBps: number
  /** Yearly renewal prices from the directory's renewal schedule, when the indexer reports it. */
  renewalYearLux?: { threeChar: number; fourChar: number; fivePlus: number }
  /** The selected policy's shortest registrable root label, when the indexer reports it. */
  minimumRootBytes?: number
  version: number
  updatedAt: number
}

export type ReservedNameCategory =
  | 'protocol'
  | 'support'
  | 'security'
  | 'ecosystem'
  | 'exchange'
  | 'partner'
  | 'phishing'

export type ReservedNamePolicy = {
  label: string
  category: ReservedNameCategory
  reason: string
}

export type OfficialRecordPlan = {
  key: string
  status: 'configured' | 'withheld'
  value?: string
  reason?: string
}

export type OfficialNameProfile = {
  label: string
  name: `${string}.dusk`
  category: Extract<ReservedNameCategory, 'ecosystem' | 'support' | 'security' | 'protocol'>
  saleLocked: true
  records: OfficialRecordPlan[]
}

export type NormalizedName = {
  canonical: string
  labels: string[]
  registrableLabel: string
}

export type NameValidationResult =
  | {
      ok: true
      name: NormalizedName
      issues: SearchIssue[]
    }
  | {
      ok: false
      canonical: string
      labels: string[]
      issues: SearchIssue[]
    }

export function validateName(value: string): NameValidationResult {
  const unicodeError = unicodeInputError(value, 'Name')
  if (unicodeError) {
    const canonical = normalizeNameInput(value)
    return { ok: false, canonical, labels: canonical.split('.'), issues: [{ tone: 'danger', text: unicodeError }] }
  }
  const result = validate(value)
  const issues: SearchIssue[] = result.issues.map((code) => ({
    tone: code === 'empty' ? 'info' : 'danger',
    text:
      code === 'empty'
        ? 'Enter a name to check availability.'
        : code === 'depth'
          ? 'Use at most three subname labels.'
          : 'Use letters, numbers and interior hyphens, with at most 63 characters per label.',
  }))
  return result.ok ? { ...result, issues } : { ...result, issues }
}
export function analyzeName(query: string, feeConfig: CoreFeeConfig = DEFAULT_FEE_CONFIG): NameResult {
  const result = analyze(query)
  const canonical = result.canonical
  const issues = validateName(query).issues
  const reserved =
    RESERVED_LABELS.includes(result.label) && canonical.split('.').length === 2
      ? { label: result.label, category: 'protocol' as const, reason: 'Reserved for official use.' }
      : undefined
  const status: NameStatus =
    result.status === 'reserved'
      ? 'reserved'
      : result.status === 'denied' || result.status === 'invalid'
        ? 'invalid'
        : 'available'
  if (result.status === 'denied')
    issues.push({ tone: 'danger', text: 'Root names need at least 3 characters.' })
  if (reserved) issues.push({ tone: 'warning', text: reserved.reason })
  return {
    canonical,
    canonicalRaw: canonical,
    displayName: canonical,
    label: result.label,
    status,
    issues,
    reserved,
    price: annualPrice(result.label, feeConfig),
    transactionBlocked: status !== 'available' || canonical.split('.').length !== 2,
  }
}
export function validateFeeConfigPrices(
  config: Pick<CoreFeeConfig, 'threeCharYearLux' | 'fourCharYearLux' | 'fivePlusYearLux' | 'premiumStartLux'>,
) {
  for (const value of [
    config.threeCharYearLux,
    config.fourCharYearLux,
    config.fivePlusYearLux,
    config.premiumStartLux,
  ])
    if (!Number.isSafeInteger(value) || value < 0 || BigInt(value) > BigInt(Number.MAX_SAFE_INTEGER))
      throw new Error('Invalid price')
  if (
    BigInt(Math.max(config.threeCharYearLux, config.fourCharYearLux, config.fivePlusYearLux)) * 10n +
      BigInt(config.premiumStartLux) >
    BigInt(Number.MAX_SAFE_INTEGER)
  )
    throw new Error('Registration quote exceeds the supported display range.')
}
export function registrationPremiumSchedule(options: {
  premiumStartLux: number
  graceEndsAtBlockHeight: number | null
  currentBlockHeight: number
  nowSeconds?: number
}) {
  const value = premium({
    ...options,
    premiumStartLux: String(options.premiumStartLux),
    graceEndsAtBlockHeight:
      options.graceEndsAtBlockHeight === null ? null : BigInt(options.graceEndsAtBlockHeight),
    currentBlockHeight: BigInt(options.currentBlockHeight),
  })
  return {
    ...value,
    premiumLux: safeNumber(value.premiumLux),
    premiumEndsAtBlockHeight:
      value.premiumEndsAtBlockHeight === null ? null : safeNumber(value.premiumEndsAtBlockHeight),
    nextStepBlockHeight: value.nextStepBlockHeight === null ? null : safeNumber(value.nextStepBlockHeight),
  }
}
export function annualFeeLux(label: string, feeConfig: CoreFeeConfig = DEFAULT_FEE_CONFIG): number {
  if (label.length <= 2) return 0
  if (label.length === 3) return feeConfig.threeCharYearLux
  if (label.length === 4) return feeConfig.fourCharYearLux
  return feeConfig.fivePlusYearLux
}

export function annualPrice(label: string, feeConfig: CoreFeeConfig = DEFAULT_FEE_CONFIG): number {
  return annualFeeLux(label, feeConfig) / LUX_PER_DUSK
}

export function durationPrice(basePrice: number, years: number): number {
  return basePrice * years
}

export function registrationFeeLux(
  label: string,
  years: number,
  feeConfig: CoreFeeConfig = DEFAULT_FEE_CONFIG,
  premiumLux = 0,
): number {
  validateFeeConfigPrices(feeConfig)
  if (
    !Number.isInteger(years) ||
    years < 1 ||
    years > 10 ||
    !Number.isSafeInteger(premiumLux) ||
    premiumLux < 0
  ) {
    throw new RangeError('Invalid registration quote.')
  }
  const total = annualFeeLux(label, feeConfig) * years + premiumLux
  if (!Number.isSafeInteger(total)) throw new RangeError('Registration quote exceeds the maximum.')
  return total
}

/** The total a claim shows for a term: its live quote when there is one, else the price-list estimate. */
export function registrationTotalLux(
  result: Pick<NameResult, 'label' | 'premiumLux' | 'quotedYears' | 'totalFeeLux'>,
  years: number,
  feeConfig: CoreFeeConfig = DEFAULT_FEE_CONFIG,
): number {
  return result.quotedYears === years && result.totalFeeLux !== undefined
    ? result.totalFeeLux
    : registrationFeeLux(result.label, years, feeConfig, result.premiumLux ?? 0)
}

export function registrationPrice(
  label: string,
  years: number,
  feeConfig: CoreFeeConfig = DEFAULT_FEE_CONFIG,
  premiumLux = 0,
): number {
  return registrationFeeLux(label, years, feeConfig, premiumLux) / LUX_PER_DUSK
}

/**
 * A renewal's price from the directory's renewal schedule. Renewals never consult the registration
 * policy, so a policy replacement leaves them alone. Null when the schedule, or its tier for this
 * label, is not known: a registration price is never a renewal estimate.
 */
export function renewalFeeLux(
  label: string,
  years: number,
  feeConfig: Pick<CoreFeeConfig, 'renewalYearLux'>,
): number | null {
  const schedule = feeConfig.renewalYearLux
  if (!schedule || label.length < 3 || !Number.isInteger(years) || years < 1 || years > 10) return null
  const total = (label.length === 3 ? schedule.threeChar : label.length === 4 ? schedule.fourChar : schedule.fivePlus) * years
  return Number.isSafeInteger(total) ? total : null
}

export function referralRewardLux(
  feeLux: number,
  feeConfig: CoreFeeConfig = DEFAULT_FEE_CONFIG,
  premiumLux = 0,
): number {
  if (
    !Number.isSafeInteger(feeLux) ||
    !Number.isSafeInteger(premiumLux) ||
    premiumLux < 0 ||
    premiumLux > feeLux
  ) {
    throw new RangeError('Invalid referral fee components.')
  }
  return Number(
    (BigInt(feeLux - premiumLux) * BigInt(feeConfig.referralRewardBps)) / 10_000n +
      (BigInt(premiumLux) * BigInt(feeConfig.premiumReferralRewardBps)) / 10_000n,
  )
}
