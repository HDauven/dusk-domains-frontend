import { useContext } from 'react'
import { NetworkFreshnessContext } from '../../app/networkFreshness'
import { ReadNotice } from '../../components/status/ReadNotice'
import { AccountViewLayout } from '../../components/ui/AccountViewLayout'
import { AccountCard, AccountDetailList, AccountDetailItem } from '../../components/ui/AccountCard'
import { registrationPrice } from '../../names/internal'
import { formatDusk } from '../../utils/format'
import { TreasuryAccountingCard } from './cards/TreasuryAccountingCard'
import { TreasuryClaimCard } from './cards/TreasuryClaimCard'
import { TreasuryClaimHistoryCard } from './cards/TreasuryClaimHistoryCard'
import { TreasuryHeader } from './cards/TreasuryHeader'
import { TreasuryPricingCard } from './cards/TreasuryPricingCard'
import type { TreasuryViewProps } from './treasuryViewTypes'

export function TreasuryView({ treasuryLoaded = true, onRetry, treasuryConfirmation, treasuryError, treasuryState, claim, pricing, wallet }: TreasuryViewProps) {
  const { feeConfig, feeConfigError } = pricing
  const { connectedAsTreasuryOperator } = wallet
  const networkNotice = useContext(NetworkFreshnessContext)
  const error = treasuryError || feeConfigError || networkNotice
  const notice = error ? <ReadNotice error={error} hasData={treasuryLoaded && pricing.feeConfigLoaded !== false} onRetry={onRetry} /> : null
  if (!treasuryLoaded) return <AccountViewLayout className="treasury-panel" labelledBy="treasury-heading" panelId="treasury"
    header={<h1 id="treasury-heading">Treasury</h1>}>
    {notice ?? <p role="status">Loading treasury…</p>}
  </AccountViewLayout>
  return (
    <AccountViewLayout
      className="treasury-panel"
      confirmation={treasuryConfirmation}
      confirmationTone="default"
      header={(
        <TreasuryHeader
          treasuryState={treasuryState}
        />
      )}
      labelledBy="treasury-heading"
      panelId="treasury"
    >
      {notice}
      {connectedAsTreasuryOperator ? <TreasuryClaimCard treasuryState={treasuryState} claim={claim} wallet={wallet} /> : null}

      <TreasuryAccountingCard treasuryState={treasuryState} />

      {connectedAsTreasuryOperator && treasuryState.source !== 'vault' && pricing.feeConfigLoaded !== false ? <TreasuryPricingCard pricing={{ ...pricing, feeConfigError: '' }} wallet={wallet} /> : <AccountCard title="Pricing" heading="Yearly prices">
        {pricing.feeConfigLoaded === false ? <p>Loading prices…</p> : <AccountDetailList>
          {['abc', 'abcd', 'abcde'].map((label, i) => <AccountDetailItem key={label} label={['3 characters', '4 characters', '5+ characters'][i]} value={`${formatDusk(registrationPrice(label, 1, feeConfig))} DUSK`} />)}
        </AccountDetailList>}
      </AccountCard>}

      <TreasuryClaimHistoryCard treasuryState={treasuryState} />
    </AccountViewLayout>
  )
}
