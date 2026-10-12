import { BLOCKS_PER_DAY, DEFAULT_GRACE_PERIOD_BLOCKS, PREMIUM_WINDOW_DAYS, type CoreFeeConfig } from '../../names/internal'
import { maxDurationYears } from '../../app/appConstants'
import { formatDusk } from '../../utils/format'

const dusk = (lux: number) => `${formatDusk(lux / 1e9)} DUSK`

/**
 * What a name costs beyond its first year, from the live policy and renewal schedule: the renewal
 * price, how far ahead a name can be paid, and the premium on a dropped name. Renewal prices are
 * only described when the indexer reports the schedule.
 */
export function pricingRules(config: CoreFeeConfig) {
  const rules: string[] = []
  const renewal = config.renewalYearLux
  if (renewal) {
    rules.push(renewal.threeChar === config.threeCharYearLux && renewal.fourChar === config.fourCharYearLux && renewal.fivePlus === config.fivePlusYearLux
      ? 'Renewing costs the same yearly price.'
      : `Renewing costs ${dusk(renewal.threeChar)} a year for 3 characters, ${dusk(renewal.fourChar)} for 4 and ${dusk(renewal.fivePlus)} for 5 or more.`)
  }
  rules.push(`A name can be paid for up to ${maxDurationYears} years ahead.`)
  // The premium on day d is (start >> d) - (start >> 21): day 0 is just under the start, and each day roughly halves it.
  const start = config.premiumStartLux
  const firstDay = start - Math.floor(start / 2 ** PREMIUM_WINDOW_DAYS)
  const premium = start > 0
    ? `, and for ${PREMIUM_WINDOW_DAYS} days the price includes a premium that starts ${firstDay < start ? 'just under ' : 'at '}${dusk(start)} and roughly halves every day.`
    : ' at the normal price.'
  rules.push(`After a name expires, renewal stays open for ${DEFAULT_GRACE_PERIOD_BLOCKS / BLOCKS_PER_DAY} days. Then anyone can register it${premium}`)
  return rules
}
