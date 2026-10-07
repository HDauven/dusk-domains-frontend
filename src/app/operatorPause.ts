import type { DuskDomainCallMetadata, DuskDomainsIndexerHealth } from '../names/internal'

export type OperatorPause = NonNullable<DuskDomainsIndexerHealth['pause']>
export const unpaused: OperatorPause = { registrationsPaused: false, tradingPaused: false }

const registrationCalls = new Set(['commit', 'complete_registration'])
const coreTradeCalls = new Set(['escrow_fixed_sale', 'escrow_auction'])
const marketplaceTradeCalls = new Set(['place_offer', 'place_bid'])

export function pauseReason(call: Pick<DuskDomainCallMetadata, 'contract' | 'functionName'>, pause: OperatorPause): string | null {
  if (pause.registrationsPaused && call.contract === 'store' && registrationCalls.has(call.functionName)) {
    return 'Registrations are paused. Please try again later.'
  }
  if (pause.tradingPaused && ((call.contract === 'store' && coreTradeCalls.has(call.functionName))
    || (call.contract === 'marketplace' && marketplaceTradeCalls.has(call.functionName)))) {
    return 'New marketplace orders are paused. Please try again later.'
  }
  return null
}
