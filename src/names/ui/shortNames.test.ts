import { expect, it } from 'vitest'
import {
  DEFAULT_FEE_CONFIG,
  analyzeName,
  annualFeeLux,
  registrationFeeLux,
  renewalFeeLux,
  validateFeeConfigPrices,
  type CoreFeeConfig,
} from './names'

const DUSK = 1_000_000_000
const schedule = { oneChar: 1000 * DUSK, twoChar: 400 * DUSK, threeChar: 150 * DUSK, fourChar: 50 * DUSK, fivePlus: 10 * DUSK }

it('takes names from 1 character at the launch release prices, before the live policy loads', () => {
  expect(DEFAULT_FEE_CONFIG).toMatchObject({ oneCharYearLux: 1000 * DUSK, twoCharYearLux: 400 * DUSK, threeCharYearLux: 150 * DUSK, minimumRootBytes: 1 })
  for (const [name, price] of [['x.dusk', 1000], ['ab.dusk', 400], ['abc.dusk', 150]] as const)
    expect(analyzeName(name), name).toMatchObject({ status: 'available', price, issues: [], transactionBlocked: false })
  expect(registrationFeeLux('x', 2)).toBe(2000 * DUSK)
})

it('prices 1 and 2 characters from the live policy, and holds a name below its minimum to it', () => {
  const live: CoreFeeConfig = { ...DEFAULT_FEE_CONFIG, oneCharYearLux: 900 * DUSK, twoCharYearLux: 300 * DUSK }
  expect([annualFeeLux('x', live), annualFeeLux('ab', live)]).toEqual([900 * DUSK, 300 * DUSK])
  const strict: CoreFeeConfig = { ...DEFAULT_FEE_CONFIG, minimumRootBytes: 3 }
  expect(annualFeeLux('ab', strict)).toBe(0)
  expect(analyzeName('ab.dusk', strict)).toMatchObject({ status: 'invalid', price: 0, issues: [{ tone: 'danger', text: 'Root names need at least 3 characters.' }] })
})

it('renews every length from the directory schedule', () => {
  expect([1, 2, 3, 4, 5, 9].map((n) => renewalFeeLux('a'.repeat(n), 2, { renewalYearLux: schedule }))).toEqual([2000, 800, 300, 100, 20, 20].map((v) => v * DUSK))
  expect(renewalFeeLux('x', 1, {})).toBeNull()
})

it('bounds the 1-character price with the premium and ten years, as the others', () => {
  const premiumStartLux = 1_000_000 * DUSK
  expect(() => validateFeeConfigPrices({ ...DEFAULT_FEE_CONFIG, premiumStartLux })).not.toThrow()
  const oneCharYearLux = Math.floor((Number.MAX_SAFE_INTEGER - premiumStartLux) / 10) + 1
  expect(() => validateFeeConfigPrices({ ...DEFAULT_FEE_CONFIG, oneCharYearLux, premiumStartLux })).toThrow()
})
