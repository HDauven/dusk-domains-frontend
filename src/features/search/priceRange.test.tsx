// @vitest-environment happy-dom
import { act, useLayoutEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import type { RegistrationQuote } from '@duskdomains/sdk'
import { analyzeName, DEFAULT_FEE_CONFIG, registrationFeeLux, registrationFeeLuxExact, registrationPrice, type CoreFeeConfig, type DuskDomainsOnChainClient } from '../../names/internal'
import { TreasuryView } from '../treasury/TreasuryView'
import { emptyTreasuryUiState } from '../treasury/treasuryState'
import type { TreasuryViewProps } from '../treasury/treasuryViewTypes'
import { priceTiers, pricingRules } from './pricingRules'
import { useNamePreview } from './useNamePreview'

// A policy can price names so that its premium start plus ten years of its highest price passes
// 2^53 - 1 Lux, about 9,007,199 DUSK. Each price is still a safe integer.
const largePolicy: CoreFeeConfig = { ...DEFAULT_FEE_CONFIG, threeCharYearLux: 1_000_000_000_000_000, premiumStartLux: 9_000_000_000_000_000 }

it('prices a name exactly under a policy whose largest prices pass 2^53 - 1 Lux', () => {
  // An ordinary name is priced as usual: the range of other prices doesn't matter.
  expect(registrationFeeLux('aurora', 1, largePolicy)).toBe(largePolicy.fivePlusYearLux)
  expect(registrationPrice('aurora', 2, largePolicy)).toBe(2 * largePolicy.fivePlusYearLux / 1e9)
  // Ten years of the largest tier is 10^16 Lux: exact as a bigint, and shown without failing.
  expect(registrationFeeLuxExact('abc', 10, largePolicy)).toBe(10n ** 16n)
  expect(registrationFeeLuxExact('abc', 1, largePolicy, 9_000_000_000_000_000)).toBe(10n ** 15n + 9n * 10n ** 15n)
  expect(registrationPrice('abc', 10, largePolicy)).toBe(10_000_000)
  // A Lux number that can't be exact is refused rather than rounded.
  expect(() => registrationFeeLux('abc', 10, largePolicy)).toThrow(RangeError)
})

it('lists the prices of such a policy on the home page and the treasury page', () => {
  expect(priceTiers(largePolicy).map(tier => tier.price)).toEqual(['1,000', '400', '1,000,000', '50', '10'])
  expect(pricingRules(largePolicy).join(' ')).toContain('9,000,000 DUSK')
  const html = renderToStaticMarkup(<TreasuryView {...{ treasuryState: emptyTreasuryUiState(), claim: {}, wallet: { connectedAsTreasuryOperator: false },
    pricing: { feeConfig: largePolicy, feeConfigError: '', feeConfigLoaded: true } } as unknown as TreasuryViewProps} />)
  expect(html).toContain('1,000,000 DUSK')
})

it('quotes a name whose live price is past 2^53 - 1 Lux without failing, and says it can’t be registered here', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const quote = { policy: Array(32).fill(9), policy_version: 5n, total_lux: '10000000000000000', height: 100n,
    quote: { version: 1, request_hash: Array(32).fill(1), config_version: 1n, registration_open: true, label_status: 'Public',
      base_lux: '10000000000', premium_lux: '9999990000000000', base_referral_bps: 2000, premium_referral_bps: 0, referral_lux: '0', valid_until: 100n } } as RegistrationQuote
  const client = { getRegistrationQuote: vi.fn(async () => ({ ok: true, value: { store: 'store', quote } })) } as unknown as DuskDomainsOnChainClient
  let preview!: ReturnType<typeof useNamePreview>
  function Probe() {
    const value = useNamePreview({ onChainClient: client, apiSearchResult: analyzeName('aurora.dusk'), currentBlockHeight: 100, duration: 1,
      feeConfig: DEFAULT_FEE_CONFIG, managedNameExpiresAt: 0, nowSeconds: 1_790_000_000, query: 'aurora.dusk', renewalYears: 1 })
    useLayoutEffect(() => { preview = value })
    return null
  }
  const root = createRoot(document.createElement('div'))
  try {
    await act(async () => root.render(<Probe />))
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })
    expect(client.getRegistrationQuote).toHaveBeenCalled()
    expect(preview.canRegister).toBe(false)
    expect(preview.registrationBlockedReason).toBe('This name’s price is higher than this site can handle.')
  } finally {
    await act(async () => root.unmount())
    vi.unstubAllGlobals()
  }
})
