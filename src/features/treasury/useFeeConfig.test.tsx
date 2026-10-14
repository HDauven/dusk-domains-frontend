// @vitest-environment happy-dom
import { act, useLayoutEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createDuskDomainsIndexerClient } from '../../names/internal'
import { useFeeConfig } from './useFeeConfig'

// The indexer's fee config before and after a governance SetPolicy selects a replacement policy.
const annual = (fivePlus: string) => ['150000000000', '150000000000', '150000000000', '50000000000', fivePlus]
const renewalSchedule = { version: '1', effective_at: '1', annual_lux: annual('10000000000'), referral_bps: 1000 }
const feeConfig = (version: string, fivePlus: string | null) => ({
  directory: {}, admissions: {}, threeCharYearLux: fivePlus && '150000000000', fourCharYearLux: fivePlus && '50000000000',
  fivePlusYearLux: fivePlus, premiumStartLux: fivePlus ? '1000000000000000' : '0',
  policy: { contractId: '09'.repeat(32), version, config: fivePlus ? { config_version: '1', registration_open: true, minimum_root_bytes: 3,
    annual_lux: annual(fivePlus), premium_start_lux: '1000000000000000', base_referral_bps: 2000, premium_referral_bps: 0, reserved: [], denied: [] } : null },
  renewalSchedule, registrationsPaused: !fivePlus, referralRewardBps: fivePlus ? 2000 : null, renewalReferralRewardBps: 1000,
  premiumReferralRewardBps: fivePlus ? 0 : null, version,
})
let served: ReturnType<typeof feeConfig>
const fetcher = vi.fn(async () => Response.json(served))
const indexer = createDuskDomainsIndexerClient({ baseUrl: 'http://indexer.test/api', fetch: fetcher as unknown as typeof fetch })

let root: Root
let shown: ReturnType<typeof useFeeConfig>
function Probe() {
  const value = useFeeConfig(indexer)
  useLayoutEffect(() => { shown = value })
  return null
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.useFakeTimers()
  fetcher.mockClear()
  served = feeConfig('4', '10000000000')
  root = createRoot(document.createElement('div'))
})
afterEach(async () => {
  await act(async () => root.unmount())
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

async function load() {
  await act(async () => root.render(<Probe />))
  await act(async () => { await vi.advanceTimersByTimeAsync(0) })
  expect(shown).toMatchObject({ feeConfigLoaded: true, feeConfigError: '', feeConfig: { version: 4, fivePlusYearLux: 10e9 } })
}

it('shows a replacement policy’s prices at the normal refresh cadence, without a reload', async () => {
  await load()
  served = feeConfig('5', '15000000000')
  await act(async () => { await vi.advanceTimersByTimeAsync(180_000) })
  expect(shown).toMatchObject({ feeConfigLoaded: true, feeConfigError: '', feeConfig: { version: 5, fivePlusYearLux: 15e9,
    renewalYearLux: { fivePlus: 10e9 } } })
})

it('stops showing the old prices when the indexer withholds an unverified replacement policy', async () => {
  await load()
  served = feeConfig('5', null)
  await act(async () => { await vi.advanceTimersByTimeAsync(180_000) })
  expect(shown).toMatchObject({ feeConfigLoaded: false, feeConfigError: 'Registration prices are unavailable right now.' })
  // Once the indexer serves the replacement, its prices show.
  served = feeConfig('5', '15000000000')
  await act(async () => { await vi.advanceTimersByTimeAsync(180_000) })
  expect(shown).toMatchObject({ feeConfigLoaded: true, feeConfigError: '', feeConfig: { version: 5, fivePlusYearLux: 15e9 } })
})
