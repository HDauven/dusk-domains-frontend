import { registrationFeeLux, registrationPremiumSchedule, PREMIUM_WINDOW_DAYS, type CoreFeeConfig, type NameResult } from '../../names/internal'

export function premiumDropsSoon(result: NameResult, currentBlockHeight?: number | null, nowSeconds = Date.now() / 1_000) {
  if (!(result.premiumLux && result.premiumLux > 0)) return false
  const seconds = currentBlockHeight != null && result.premiumNextStepBlockHeight != null
    ? (result.premiumNextStepBlockHeight - currentBlockHeight) * 10
    : (Date.parse(result.premiumNextStepAt ?? '') / 1_000 - nowSeconds)
  return seconds > 0 && seconds <= 600
}

export type PremiumConfirmationQuote = { totalLux: number; nextTotalLux: number; nextStepAt: string }

export function premiumConfirmationQuote(result: NameResult, years: number, config: CoreFeeConfig, height?: number | null): PremiumConfirmationQuote | null {
  if (!result || !premiumDropsSoon(result, height)) return null
  const nextHeight = result.premiumNextStepBlockHeight
  const offset = BigInt(config.premiumStartLux) >> BigInt(PREMIUM_WINDOW_DAYS)
  const nextPremium = result.graceEndsAtBlockHeight != null && nextHeight != null
    ? registrationPremiumSchedule({ premiumStartLux: config.premiumStartLux, graceEndsAtBlockHeight: result.graceEndsAtBlockHeight, currentBlockHeight: nextHeight }).premiumLux
    // Legacy date-only responses still carry the current premium, including the curve's offset.
    : Math.max(0, Number(((BigInt(result.premiumLux ?? 0) + offset) >> 1n) - offset))
  const nextStepAt = height != null && nextHeight != null
    ? new Date(Date.now() + (nextHeight - height) * 10_000).toISOString()
    : result.premiumNextStepAt!
  return { totalLux: registrationFeeLux(result.label, years, config, result.premiumLux ?? 0),
    nextTotalLux: registrationFeeLux(result.label, years, config, nextPremium), nextStepAt }
}
