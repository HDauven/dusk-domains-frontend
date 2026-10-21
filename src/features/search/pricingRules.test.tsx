import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { DEFAULT_FEE_CONFIG, type CoreFeeConfig } from '../../names/internal'
import { frozenView } from '../../names/http/frozenViews'
import { feeConfigValuesMatch } from '../treasury/feeConfig'
import * as pricing from './pricingRules'
import { pricingRules } from './pricingRules'
import { SearchHero } from './SearchHero'

const launch: CoreFeeConfig = { ...DEFAULT_FEE_CONFIG, renewalYearLux: { oneChar: 1000e9, twoChar: 400e9, threeChar: 150e9, fourChar: 50e9, fivePlus: 10e9 } }

it('states renewal, the ten-year limit and the dropped-name premium from the live policy', () => {
  expect(pricingRules(launch)).toEqual([
    'Renewing costs the same yearly price.',
    'A name can be paid for up to 10 years ahead.',
    'After a name expires, renewal stays open for 30 days. Then anyone can register it, and for 21 days the price includes a premium that starts just under 1,000,000 DUSK and roughly halves every day.',
  ])
  // Governance can change renewal prices on their own; then they are listed.
  expect(pricingRules({ ...launch, renewalYearLux: { ...launch.renewalYearLux!, threeChar: 200e9, fivePlus: 12.5e9 } })[0])
    .toBe('Renewing costs 1,000 DUSK a year for 1 character, 400 DUSK for 2, 200 DUSK for 3, 50 DUSK for 4 and 12.5 DUSK for 5 or more.')
  // Under a policy that takes names from 3 characters, the shorter lengths are not listed.
  expect(pricingRules({ ...launch, minimumRootBytes: 3, renewalYearLux: { ...launch.renewalYearLux!, threeChar: 200e9 } })[0])
    .toBe('Renewing costs 200 DUSK a year for 3 characters, 50 DUSK for 4 and 10 DUSK for 5 or more.')
  // Without renewal prices from the chain, nothing is said about them.
  expect(pricingRules({ ...launch, renewalYearLux: undefined })).not.toContain('Renewing costs the same yearly price.')
  expect(pricingRules({ ...launch, premiumStartLux: 0 })[2]).toBe('After a name expires, renewal stays open for 30 days. Then anyone can register it at the normal price.')
})

it('reads renewal prices from the directory schedule the indexer publishes', () => {
  const view = frozenView({ ...DEFAULT_FEE_CONFIG, threeCharYearLux: '150000000000', fourCharYearLux: '50000000000', fivePlusYearLux: '10000000000',
    premiumStartLux: '1000000000000000', policy: { version: '1', config: { base_referral_bps: 2000, premium_referral_bps: 0, minimum_root_bytes: 1,
      annual_lux: ['900000000000', '300000000000', '150000000000', '50000000000', '10000000000'] } },
    renewalSchedule: { version: '2', effective_at: '100', annual_lux: ['1000000000000', '400000000000', '150000000000', '50000000000', '10000000000'], referral_bps: 1000 } }, '/fee-config') as CoreFeeConfig
  expect(view.renewalYearLux).toEqual({ oneChar: 1000e9, twoChar: 400e9, threeChar: 150e9, fourChar: 50e9, fivePlus: 10e9 })
  // The 1- and 2-character prices come from the selected policy's config.
  expect(view).toMatchObject({ oneCharYearLux: 900e9, twoCharYearLux: 300e9, minimumRootBytes: 1 })
  // A renewal price change alone reaches the page.
  expect(feeConfigValuesMatch(launch, { ...launch, renewalYearLux: { ...launch.renewalYearLux!, twoChar: 450e9 } })).toBe(false)
  expect(feeConfigValuesMatch(launch, { ...launch, oneCharYearLux: 1100e9 })).toBe(false)
  expect(feeConfigValuesMatch(launch, { ...launch })).toBe(true)
})

it('offers the rules beside the price list before anyone searches or connects', () => {
  const hero = (checked: boolean) => renderToStaticMarkup(<SearchHero checked={checked} loading={false} onCheckAvailability={vi.fn()} onQueryChange={vi.fn()} query=""
    priceTiers={[{ label: '3 characters', price: '150' }]} pricingRules={pricingRules(launch)} />)
  expect(hero(false)).toContain('<summary>Renewals and expiry</summary>')
  // Unstyled bullets keep their list semantics.
  expect(hero(false)).toContain('<ul role="list">')
  expect(hero(false)).toContain('A name can be paid for up to 10 years ahead.')
  expect(hero(true)).not.toContain('Renewals and expiry')
})

// A replacement policy can raise the minimum name length; the price list then starts there.
it.each([
  [undefined, ['1 character: 1,000', '2 characters: 400', '3 characters: 150', '4 characters: 50', '5+ characters: 10']],
  [3, ['3 characters: 150', '4 characters: 50', '5+ characters: 10']],
  [4, ['4 characters: 50', '5+ characters: 10']],
  [6, ['6+ characters: 10']],
])('lists yearly prices only for lengths the policy accepts (minimum %s)', (minimumRootBytes, tiers) => {
  expect(pricing.priceTiers?.({ ...launch, minimumRootBytes }).map(tier => `${tier.label}: ${tier.price}`)).toEqual(tiers)
})

it('reads the selected policy’s minimum name length from the indexer', () => {
  const view = frozenView({ ...DEFAULT_FEE_CONFIG, threeCharYearLux: '150000000000', fourCharYearLux: '50000000000', fivePlusYearLux: '10000000000',
    premiumStartLux: '1000000000000000', policy: { version: '5', config: { minimum_root_bytes: 4, base_referral_bps: 2000, premium_referral_bps: 0 } },
    renewalSchedule: null }, '/fee-config') as CoreFeeConfig
  expect(view).toMatchObject({ version: 5, minimumRootBytes: 4 })
})
