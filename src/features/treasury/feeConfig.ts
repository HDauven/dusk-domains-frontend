import {
  formatLuxAsDusk,
  validateFeeConfigPrices,
  type CoreFeeConfig,
  type IndexedReferralState,
} from '../../names/internal'

export type FeeConfigFormState = {
  threeCharYearDusk: string
  fourCharYearDusk: string
  fivePlusYearDusk: string
  premiumStartDusk: string
  premiumReferralRewardPercent: string
  referralRewardPercent: string
  renewalReferralRewardPercent: string
}

export function formatLuxNumberAsDusk(value: number | string | bigint) {
  if ((typeof value === 'number' && !Number.isSafeInteger(value)) || BigInt(value) <= 0n) return '0 DUSK'
  return formatLuxAsDusk(BigInt(value))
}

export function parseDuskAmountToLux(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const match = /^(\d+)(?:\.(\d{1,9}))?$/.exec(trimmed)
  if (!match) return null
  const whole = BigInt(match[1])
  const fraction = BigInt((match[2] ?? '').padEnd(9, '0') || '0')
  return whole * 1_000_000_000n + fraction
}

function formatLuxInput(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0'
  const lux = BigInt(value)
  const whole = lux / 1_000_000_000n
  const fraction = (lux % 1_000_000_000n).toString().padStart(9, '0').replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : String(whole)
}

function formatBasisPointsPercent(bps: number) {
  if (!Number.isFinite(bps)) return '0'
  const percent = bps / 100
  if (Number.isInteger(percent)) return String(percent)
  return percent.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

export function feeConfigFormFromConfig(config: CoreFeeConfig): FeeConfigFormState {
  return {
    threeCharYearDusk: formatLuxInput(config.threeCharYearLux),
    fourCharYearDusk: formatLuxInput(config.fourCharYearLux),
    fivePlusYearDusk: formatLuxInput(config.fivePlusYearLux),
    premiumStartDusk: formatLuxInput(config.premiumStartLux),
    premiumReferralRewardPercent: formatBasisPointsPercent(config.premiumReferralRewardBps),
    referralRewardPercent: formatBasisPointsPercent(config.referralRewardBps),
    renewalReferralRewardPercent: formatBasisPointsPercent(config.renewalReferralRewardBps),
  }
}

export function parseFeeConfigForm(form: FeeConfigFormState) {
  const threeCharYearLux = parseDuskAmountToLux(form.threeCharYearDusk)
  if (threeCharYearLux === null || threeCharYearLux <= 0n) {
    return { ok: false as const, error: 'Enter a valid 3-character annual price.' }
  }
  const fourCharYearLux = parseDuskAmountToLux(form.fourCharYearDusk)
  if (fourCharYearLux === null || fourCharYearLux <= 0n) {
    return { ok: false as const, error: 'Enter a valid 4-character annual price.' }
  }
  const fivePlusYearLux = parseDuskAmountToLux(form.fivePlusYearDusk)
  if (fivePlusYearLux === null || fivePlusYearLux <= 0n) {
    return { ok: false as const, error: 'Enter a valid 5+ character annual price.' }
  }
  const premiumStartLux = parseDuskAmountToLux(form.premiumStartDusk)
  if (premiumStartLux === null || premiumStartLux < 0n) {
    return { ok: false as const, error: 'Enter a valid starting premium. Use 0 to disable it.' }
  }
  const maxClientLux = BigInt(Number.MAX_SAFE_INTEGER)
  if (premiumStartLux > maxClientLux || threeCharYearLux > maxClientLux || fourCharYearLux > maxClientLux || fivePlusYearLux > maxClientLux) {
    return { ok: false as const, error: 'One of the prices is too large for this client.' }
  }

  try {
    validateFeeConfigPrices({ threeCharYearLux: Number(threeCharYearLux), fourCharYearLux: Number(fourCharYearLux),
      fivePlusYearLux: Number(fivePlusYearLux), premiumStartLux: Number(premiumStartLux) })
  } catch {
    return { ok: false as const, error: 'The starting premium plus 10 years must not exceed 9,007,199.254740991 DUSK.' }
  }
  const premiumReferralPercent = Number(form.premiumReferralRewardPercent.trim())
  if (!Number.isFinite(premiumReferralPercent) || premiumReferralPercent < 0 || premiumReferralPercent > 30) {
    return { ok: false as const, error: 'Premium referral reward must be between 0% and 30%.' }
  }
  const referralPercent = Number(form.referralRewardPercent.trim())
  if (!Number.isFinite(referralPercent) || referralPercent < 0 || referralPercent > 30) {
    return { ok: false as const, error: 'Referral reward must be between 0% and 30%.' }
  }
  const renewalReferralPercent = Number(form.renewalReferralRewardPercent.trim())
  if (!Number.isFinite(renewalReferralPercent) || renewalReferralPercent < 0 || renewalReferralPercent > 30) {
    return { ok: false as const, error: 'Renewal referral reward must be between 0% and 30%.' }
  }

  return {
    ok: true as const,
    config: {
      threeCharYearLux: Number(threeCharYearLux),
      fourCharYearLux: Number(fourCharYearLux),
      fivePlusYearLux: Number(fivePlusYearLux),
      referralRewardBps: Math.round(referralPercent * 100),
      renewalReferralRewardBps: Math.round(renewalReferralPercent * 100),
      premiumReferralRewardBps: Math.round(premiumReferralPercent * 100),
      premiumStartLux: Number(premiumStartLux),
    },
  }
}

export function feeConfigValuesMatch(
  current: CoreFeeConfig,
  next: Omit<CoreFeeConfig, 'version' | 'updatedAt'>,
) {
  return current.threeCharYearLux === next.threeCharYearLux
    && current.fourCharYearLux === next.fourCharYearLux
    && current.fivePlusYearLux === next.fivePlusYearLux
    && current.referralRewardBps === next.referralRewardBps
    && current.renewalReferralRewardBps === next.renewalReferralRewardBps
    && current.premiumReferralRewardBps === next.premiumReferralRewardBps
    && current.premiumStartLux === next.premiumStartLux
}

export function referralRewardStatusLabel(args: {
  loading: boolean
  selectedAddress: string
  error: string
  supported: boolean
  claimable: boolean
}) {
  if (args.loading) return 'Refreshing'
  if (!args.selectedAddress) return 'Connect'
  if (args.error) return 'Unavailable'
  if (!args.supported) return 'Unavailable'
  return args.claimable ? 'Available' : 'No rewards'
}

export function referralRewardStatusGuidance(args: {
  loading: boolean
  selectedAddress: string
  error: string
  supported: boolean
  claimable: boolean
}) {
  if (args.loading) return 'Refreshing rewards.'
  if (!args.selectedAddress) return 'Connect wallet to view rewards.'
  if (args.error) return 'Rewards unavailable.'
  if (!args.supported) return 'Rewards unavailable.'
  return args.claimable
    ? 'Rewards are available for this wallet.'
    : 'No rewards available to claim.'
}

export function referralRewardEmptyCopy(state: IndexedReferralState) {
  return state.referralCount > 0 || BigInt(state.claimedLux) > 0n || state.recentActivity.length > 0
    ? 'No rewards available to claim.'
    : 'Share your link to start earning rewards.'
}
