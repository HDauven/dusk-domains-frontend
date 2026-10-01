import type { DuskDomainCallMetadata, DuskDomainsIndexerHealth } from '../names/internal'

export type OperatorPause = NonNullable<DuskDomainsIndexerHealth['pause']>
export const unpaused: OperatorPause = { registrationsPaused: false, tradingPaused: false }

const registrationCalls = new Set(['commit_runtime', 'complete_registration_runtime'])
const coreTradeCalls = new Set(['escrow_fixed_sale_runtime', 'escrow_auction_runtime', 'accept_marketplace_offer_runtime'])
const marketplaceTradeCalls = new Set(['place_bid_runtime', 'place_offer_runtime', 'buy_fixed_sale_runtime'])

export function pauseReason(call: DuskDomainCallMetadata, pause: OperatorPause): string | null {
  if (pause.registrationsPaused && call.contract === 'core' && registrationCalls.has(call.functionName)) {
    return 'Registrations are paused. Please try again later.'
  }
  if (pause.tradingPaused && ((call.contract === 'core' && coreTradeCalls.has(call.functionName))
    || (call.contract === 'marketplace' && marketplaceTradeCalls.has(call.functionName)))) {
    return 'Marketplace trading is paused. Please try again later.'
  }
  return null
}
