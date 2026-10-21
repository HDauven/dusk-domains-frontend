import { BLOCKS_PER_DAY, DEFAULT_GRACE_PERIOD_BLOCKS, PREMIUM_WINDOW_DAYS, annualFeeLux, minimumRootBytes, registrationPrice, type CoreFeeConfig } from '../../names/internal'
import { maxDurationYears } from '../../app/appConstants'
import { formatDusk } from '../../utils/format'

const dusk = (lux: number) => `${formatDusk(lux / 1e9)} DUSK`

/** The tiers a policy's prices cover, lengths 1, 2, 3, 4 and 5+, from the shortest name it accepts; 5+ always. */
const tierLengths = (config: CoreFeeConfig) => [1, 2, 3, 4, 5].filter(length => length >= minimumRootBytes(config) || length === 5)
const characters = (length: number) => `${length} ${length === 1 ? 'character' : 'characters'}`
/** A name of a tier's length; the last tier's from the policy minimum when that is longer. */
const sample = (config: CoreFeeConfig, length: number) => 'a'.repeat(length === 5 ? Math.max(5, minimumRootBytes(config)) : length)

/** The yearly price by name length, from the length the selected policy accepts; the last tier covers longer names. */
export function priceTiers(config: CoreFeeConfig) {
  return tierLengths(config).map(length => ({
    label: length === 5 ? `${Math.max(5, minimumRootBytes(config))}+ characters` : characters(length),
    price: formatDusk(registrationPrice(sample(config, length), 1, config)),
  }))
}

/**
 * What a name costs beyond its first year, from the live policy and renewal schedule: the renewal
 * price, how far ahead a name can be paid, and the premium on a dropped name. Renewal prices are
 * only described when the indexer reports the schedule.
 */
export function pricingRules(config: CoreFeeConfig) {
  const rules: string[] = []
  const renewal = config.renewalYearLux
  if (renewal) {
    const lengths = tierLengths(config),
      tier = [renewal.oneChar, renewal.twoChar, renewal.threeChar, renewal.fourChar, renewal.fivePlus]
    const prices = lengths.map((length, i) => `${dusk(tier[length - 1])}${i === 0 ? ` a year for ${characters(length)}` : ` for ${length === 5 ? '5 or more' : length}`}`)
    rules.push(lengths.every(length => tier[length - 1] === annualFeeLux(sample(config, length), config))
      ? 'Renewing costs the same yearly price.'
      : `Renewing costs ${prices.slice(0, -1).join(', ')} and ${prices.at(-1)}.`)
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
