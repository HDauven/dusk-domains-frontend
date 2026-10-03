import { premiumDropsSoon } from './premiumTiming'
import type { NameResult } from '../../names/internal'
import { formatLuxNumberAsDusk } from '../treasury/feeConfig'

export function PremiumNotice({ result, currentBlockHeight }: { result?: NameResult; currentBlockHeight?: number | null }) {
  if (!result?.premiumLux || !result.premiumEndsAt) return null
  const end = new Date(result.premiumEndsAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  return <div className="field-note">
    <p>Premium: {formatLuxNumberAsDusk(result.premiumLux)}, halves daily until {end}.</p>
    {premiumDropsSoon(result, currentBlockHeight) ? <p className="warning">The price drops within 10 minutes. Wait for the lower price or confirm when registering.</p> : null}
  </div>
}
