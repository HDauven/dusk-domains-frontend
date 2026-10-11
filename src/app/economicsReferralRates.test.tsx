import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { DEFAULT_FEE_CONFIG } from '../names/internal'
import { useEconomicsRuntime } from './useEconomicsRuntime'

const fees = vi.hoisted(() => ({ state: { feeConfigLoaded: true, feeConfigError: '' } as Record<string, unknown> }))
const referral = vi.hoisted(() => ({ args: null as null | { feeConfig?: unknown } }))
vi.mock('../features/treasury/useFeeConfig', () => ({ useFeeConfig: () => ({ feeConfigLoading: false, loadFeeConfig: () => {}, ...fees.state }) }))
vi.mock('../features/treasury/useTreasuryFeature', () => ({ useTreasuryFeature: () => ({ loadTreasuryView: () => {}, treasuryProps: {} }) }))
vi.mock('../features/referrals/useReferralFeature', () => ({ useReferralFeature: (args: { feeConfig?: unknown }) => {
  referral.args = args
  return { activeReferral: null, appliedReferral: null, loadReferralAccount: () => {}, referralsProps: {}, resetReferralCopied: () => {} }
} }))

function rates(state: Record<string, unknown>) {
  fees.state = { feeConfig: DEFAULT_FEE_CONFIG, ...state }
  function Probe() { useEconomicsRuntime({ mainView: 'search' } as never); return null }
  renderToStaticMarkup(<Probe />)
  return referral.args?.feeConfig
}

it('gives the referral page the reward rates only once the live fee configuration is read', () => {
  expect(rates({ feeConfigLoaded: true, feeConfigError: '' })).toBe(DEFAULT_FEE_CONFIG)
  // The built-in defaults are not the chain's rates.
  expect(rates({ feeConfigLoaded: false, feeConfigError: '' })).toBeNull()
  expect(rates({ feeConfigLoaded: true, feeConfigError: 'Live pricing is unavailable right now.' })).toBeNull()
})
