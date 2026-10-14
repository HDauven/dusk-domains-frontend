import { expect, it } from 'vitest'
import { createDuskDomainsIndexerClient } from './client'

// The indexer's views after a governance SetPolicy selects a replacement policy. It serves the new
// policy's config and prices once it has authenticated the policy's initialization against its
// admission; until then (or on a mismatch) it withholds them: config null, null prices, paused.
const launch = { config_version: '1', registration_open: true, minimum_root_bytes: 3,
  annual_lux: ['150000000000', '150000000000', '150000000000', '50000000000', '10000000000'],
  premium_start_lux: '1000000000000000', base_referral_bps: 2000, premium_referral_bps: 0, reserved: [], denied: [] }
const renewalSchedule = { version: '1', effective_at: '1', annual_lux: launch.annual_lux, referral_bps: 1000 }
const policy = (config: typeof launch | null) => ({ contractId: '09'.repeat(32), version: '5', config })
const feeConfig = (config: typeof launch | null) => ({
  directory: {}, admissions: {},
  threeCharYearLux: config?.annual_lux[2] ?? null, fourCharYearLux: config?.annual_lux[3] ?? null,
  fivePlusYearLux: config?.annual_lux[4] ?? null, premiumStartLux: config?.premium_start_lux ?? '0',
  policy: policy(config), renewalSchedule, registrationsPaused: !config,
  referralRewardBps: config?.base_referral_bps ?? null, renewalReferralRewardBps: 1000,
  premiumReferralRewardBps: config?.premium_referral_bps ?? null, version: '5',
})
const search = (config: typeof launch | null) => ({
  canonical: 'aurora.dusk', canonicalRaw: 'aurora.dusk', displayName: 'aurora.dusk', label: 'aurora', status: 'available',
  price: config ? 15 : null, premiumLux: '0', premiumEndsAt: null, premiumEndsAtBlockHeight: null, premiumNextStepAt: null,
  premiumNextStepBlockHeight: null, graceEndsAtBlockHeight: null, issues: [], transactionBlocked: !config,
  policy: policy(config), renewalSchedule, estimate: true,
})
function client(body: (path: string) => unknown) {
  return createDuskDomainsIndexerClient({
    baseUrl: 'http://indexer.test/api',
    fetch: (async (input: string | URL | Request) => Response.json(body(new URL(String(input)).pathname))) as typeof fetch,
  })
}
const replacement = { ...launch, annual_lux: [...launch.annual_lux.slice(0, 4), '15000000000'], base_referral_bps: 1500 }

it('reads the replacement policy’s prices with the unchanged renewal schedule', async () => {
  const indexer = client(path => path.endsWith('/fee-config') ? feeConfig(replacement) : search(replacement))
  expect(await indexer.getFeeConfig()).toMatchObject({
    version: 5, threeCharYearLux: 150e9, fourCharYearLux: 50e9, fivePlusYearLux: 15e9, referralRewardBps: 1500,
    renewalReferralRewardBps: 1000, renewalYearLux: { threeChar: 150e9, fourChar: 50e9, fivePlus: 10e9 },
  })
  expect(await indexer.searchName('aurora.dusk')).toMatchObject({ status: 'available', price: 15, transactionBlocked: false })
})

it('reads a name while the indexer withholds the prices of a policy it cannot verify', async () => {
  const indexer = client(() => search(null))
  expect(await indexer.searchName('aurora.dusk')).toMatchObject({ status: 'available', price: null, transactionBlocked: true })
})

it('says registration prices are unavailable instead of rejecting the indexer’s withheld policy as invalid', async () => {
  const indexer = client(() => feeConfig(null))
  const error = await indexer.getFeeConfig().then(() => null, (error: unknown) => error)
  expect(error).toMatchObject({ name: 'RegistrationPricesUnavailableError', message: 'Registration prices are unavailable right now.' })
})
