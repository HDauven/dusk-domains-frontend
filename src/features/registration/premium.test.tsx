import type { ComponentProps } from 'react'
import { emptyTreasuryState } from '@duskdomains/sdk/projection'
import { TreasuryAccountingCard } from '../treasury/cards/TreasuryAccountingCard'
import { TreasuryPricingCard } from '../treasury/cards/TreasuryPricingCard'
import { afterEach, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { analyzeName, DEFAULT_FEE_CONFIG } from '../../names/internal'
import { PremiumNotice } from './PremiumNotice'
import { premiumConfirmationQuote, premiumDropsSoon } from './premiumTiming'
import { RegistrationSummary } from './RegistrationSummary'
import { SearchResultOverview } from '../search/SearchResultOverview'
import { useNamePreview } from '../search/useNamePreview'
import { completeRegistration } from './completeRegistrationAction'
import type { UseRegistrationActionsProps } from './registrationActionTypes'
import { feeConfigFormFromConfig, parseFeeConfigForm, feeConfigValuesMatch } from '../treasury/feeConfig'

const grace = 10_000
const boundary = grace + 8_640
const result = { ...analyzeName('aurora'), premiumLux: 1_000_000_000, graceEndsAtBlockHeight: grace,
  premiumEndsAt: '2026-10-24T12:00:00.000Z', premiumNextStepAt: '2026-10-04T12:00:00.000Z', premiumNextStepBlockHeight: boundary }

afterEach(() => vi.unstubAllGlobals())

it('shows the premium and end date in the search card and claim summary', () => {
  const summary = renderToStaticMarkup(<RegistrationSummary premiumResult={result} activeReferral={null} appliedReferral={null} committed duration={1} expiryDate="3 Oct 2027" feeConfigError="" onChangeTerm={() => {}} registerSetsPrimary registrationComplete={false} registrationFee={11} registrationTargetAddress="" selectedAddress="" />)
  const search = renderToStaticMarkup(<SearchResultOverview premiumResult={result} canRegister displayName="aurora.dusk" duration={1} expiryDate="3 Oct 2027" feeConfigLoading={false} onContinueRegistration={() => {}} onDurationChange={() => {}} onOpenPendingReservation={() => {}} onOpenPendingReservations={() => {}} onViewDetails={() => {}} registrationFee={11} resultIssues={[]} resultStatus="available" savedReservation={null} savedReservationWindow={null} />)
  for (const html of [summary, search]) {
    expect(html).toContain('Premium: 1 DUSK, halves daily until')
    expect(html).toContain('2026')
    expect(html).toContain('11')
  }
  expect(renderToStaticMarkup(<PremiumNotice result={{ ...result, premiumLux: 0 }} />)).toBe('')
})

it('warns only during the final ten minutes before the next step', () => {
  expect(premiumDropsSoon(result, boundary - 61)).toBe(false)
  expect(premiumDropsSoon(result, boundary - 60)).toBe(true)
  expect(premiumDropsSoon(result, boundary - 1)).toBe(true)
  expect(premiumDropsSoon(result, boundary)).toBe(false)
  const html = renderToStaticMarkup(<PremiumNotice result={result} currentBlockHeight={boundary - 1} />)
  expect(html).toContain('Wait for the lower price or confirm')
})

it.each([undefined, 10_000_000_000, 11_000_000_000])('requires the displayed total near a step boundary (confirmed: %s)', async confirmedTotal => {
  const confirm = vi.fn(() => { throw new Error('Native dialogs are blocked') })
  vi.stubGlobal('window', { confirm })
  const ensureAuthority = vi.fn(() => false)
  await completeRegistration({
    result, lifecycleBaseBlockHeight: boundary - 1, displayName: 'aurora.dusk', duration: 1, feeConfig: DEFAULT_FEE_CONFIG,
    canRegister: true, committed: true, commitWindow: { status: 'ready' }, preparedCommit: {},
    selectedAddress: 'wallet', registrationTargetReady: true, registrationTargetAddressErrors: [],
    submitNameWrite: { captureWorkspace: () => () => true }, setWalletError: vi.fn(), setRegistrationCompletion: vi.fn(),
    ensureContractAuthorityForLiveWrite: ensureAuthority,
  } as unknown as UseRegistrationActionsProps, confirmedTotal)
  expect(confirm).not.toHaveBeenCalled()
  expect(ensureAuthority).toHaveBeenCalledTimes(confirmedTotal === 11_000_000_000 ? 1 : 0)
})

it('refreshes the premium and total at a block boundary while leaving renewal at base price', () => {
  function Preview({ height }: { height: number }) {
    const preview = useNamePreview({ apiSearchResult: result, currentBlockHeight: height, duration: 2,
      feeConfig: DEFAULT_FEE_CONFIG, managedNameExpiresAt: 20_000, nowSeconds: 1_000, query: 'aurora', renewalYears: 2 })
    return <span>{preview.registrationFee}|{preview.renewalFee}|{preview.result.premiumLux}</span>
  }
  const start = BigInt(DEFAULT_FEE_CONFIG.premiumStartLux)
  for (const [height, day] of [[boundary - 1, 0], [boundary, 1], [grace + 21 * 8_640, 21]]) {
    const premium = day < 21 ? Number((start >> BigInt(day)) - (start >> 21n)) : 0
    expect(renderToStaticMarkup(<Preview height={height} />)).toContain(`${20 + premium / 1e9}|20|${premium}`)
  }
})

it('edits the starting premium, preserves its referral share and validates the maximum total', () => {
  const config = { ...DEFAULT_FEE_CONFIG, premiumReferralRewardBps: 1_000 }
  const form = feeConfigFormFromConfig(config)
  expect(form).toMatchObject({ premiumStartDusk: '1000000', premiumReferralRewardPercent: '10' })
  const parsed = parseFeeConfigForm(form)
  expect(parsed).toMatchObject({ ok: true, config: { premiumStartLux: 1e15, premiumReferralRewardBps: 1_000 } })
  if (parsed.ok) expect(feeConfigValuesMatch(config, parsed.config)).toBe(true)
  expect(parseFeeConfigForm({ ...form, premiumStartDusk: '0' })).toMatchObject({ ok: true, config: { premiumStartLux: 0 } })
  expect(parseFeeConfigForm({ ...form, premiumStartDusk: '9007199.254740991' }).ok).toBe(false)
  expect(parseFeeConfigForm({ ...form, premiumStartDusk: '-1' }).ok).toBe(false)
})

it('shows premium income within registration receipts in Treasury', () => {
  const html = renderToStaticMarkup(<TreasuryAccountingCard treasuryState={{ ...emptyTreasuryState(), premiumReceivedLux: 25_000_000_000 }} />)
  expect(html).toContain('Premiums (included in registrations)')
  expect(html).toContain('25 DUSK')
})

it('renders the starting premium and separate referral controls', () => {
  const props = { feeConfig: DEFAULT_FEE_CONFIG, feeConfigForm: feeConfigFormFromConfig(DEFAULT_FEE_CONFIG),
    selectedAddress: '', onFeeConfigFieldChange: vi.fn() } as unknown as ComponentProps<typeof TreasuryPricingCard>
  const html = renderToStaticMarkup(<TreasuryPricingCard {...props} />)
  expect(html).toContain('id="fee-premium-start"')
  expect(html).toContain('value="1000000"')
  expect(html).toContain('id="fee-premium-referral"')
})

it('round-trips every Lux field exactly at the contract cap, including referral-only edits', () => {
  const config = { ...DEFAULT_FEE_CONFIG, threeCharYearLux: 150000000004, fourCharYearLux: 35000000001,
    fivePlusYearLux: 10000000003, premiumStartLux: 9005699254740951 }
  const form = feeConfigFormFromConfig(config)
  expect(form).toMatchObject({ threeCharYearDusk: '150.000000004', fourCharYearDusk: '35.000000001',
    fivePlusYearDusk: '10.000000003', premiumStartDusk: '9005699.254740951' })
  const parsed = parseFeeConfigForm(form)
  expect(parsed.ok).toBe(true)
  if (parsed.ok) expect(feeConfigValuesMatch(config, parsed.config)).toBe(true)
  expect(parseFeeConfigForm({ ...form, referralRewardPercent: '12' })).toMatchObject({ ok: true,
    config: { threeCharYearLux: config.threeCharYearLux, fourCharYearLux: config.fourCharYearLux,
      fivePlusYearLux: config.fivePlusYearLux, premiumStartLux: config.premiumStartLux, referralRewardBps: 1200 } })
})

it('uses block heights for warnings in both callers even with stale dates', () => {
  const stale = { ...result, premiumNextStepAt: '2000-01-01T00:00:00.000Z' }
  const summary = renderToStaticMarkup(<RegistrationSummary premiumResult={stale} currentBlockHeight={boundary - 30} activeReferral={null} appliedReferral={null} committed duration={1} expiryDate="3 Oct 2027" feeConfigError="" onChangeTerm={() => {}} registerSetsPrimary registrationComplete={false} registrationFee={11} registrationTargetAddress="" selectedAddress="" />)
  const search = renderToStaticMarkup(<SearchResultOverview premiumResult={stale} currentBlockHeight={boundary - 30} canRegister displayName="aurora.dusk" duration={1} expiryDate="3 Oct 2027" feeConfigLoading={false} onContinueRegistration={() => {}} onDurationChange={() => {}} onOpenPendingReservation={() => {}} onOpenPendingReservations={() => {}} onViewDetails={() => {}} registrationFee={11} resultIssues={[]} resultStatus="available" savedReservation={null} savedReservationWindow={null} />)
  for (const html of [summary, search]) expect(html).toContain('The price drops within 10 minutes.')
})

it('quotes the next total including the term and removes confirmation at the boundary', () => {
  const config = { ...DEFAULT_FEE_CONFIG, premiumStartLux: 2_000_000_000 }
  const quote = premiumConfirmationQuote({ ...result, premiumLux: 1_999_999_047 }, 2, config, boundary - 30)
  expect(quote).toMatchObject({ totalLux: 21_999_999_047, nextTotalLux: 20_999_999_047 })
  expect(premiumConfirmationQuote(result, 2, config, boundary)).toBeNull()
})

it('renders treasury and referral totals above the safe-number limit exactly', () => {
  const html = renderToStaticMarkup(<TreasuryAccountingCard treasuryState={{ ...emptyTreasuryState(),
    premiumReceivedLux: '10000000000000001', referralClaimableLux: '9007199254740993', referralClaimedLux: 1,
    claims: [{ operator: null, operatorRecipient: 'wallet', amountLux: '10000000000000001', remainingLux: 0, txId: null, blockHeight: 1 }] }} />)
  expect(html).toContain('10000000.000000001 DUSK')
  expect(html).toContain('9007199.254740994 DUSK')
})

it.each([0, 1, 20])('quotes the legacy date-only next price exactly on day %s', day => {
  const start = BigInt(DEFAULT_FEE_CONFIG.premiumStartLux), offset = start >> 21n
  const premiumLux = Number((start >> BigInt(day)) - offset)
  const nextPremium = day === 20 ? 0 : Number((start >> BigInt(day + 1)) - offset)
  const quote = premiumConfirmationQuote({ ...result, premiumLux, graceEndsAtBlockHeight: null,
    premiumNextStepBlockHeight: null, premiumNextStepAt: new Date(Date.now() + 300_000).toISOString() }, 2, DEFAULT_FEE_CONFIG, null)
  expect(quote).toMatchObject({ totalLux: 20_000_000_000 + premiumLux, nextTotalLux: 20_000_000_000 + nextPremium })
})
