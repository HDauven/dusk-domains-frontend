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

export function TreasuryView({ treasuryConfirmation, treasuryError, treasuryState, claim, pricing, wallet }: TreasuryViewProps) {
  const { feeConfig, feeConfigError } = pricing
  const { connectedAsTreasuryOperator } = wallet
  return (
    <AccountViewLayout
      className="treasury-panel"
      confirmation={treasuryConfirmation}
      confirmationTone="default"
      error={treasuryError}
      header={(
        <TreasuryHeader
          treasuryState={treasuryState}
        />
      )}
      labelledBy="treasury-heading"
      panelId="treasury"
    >
      {connectedAsTreasuryOperator ? <TreasuryClaimCard treasuryState={treasuryState} claim={claim} wallet={wallet} /> : null}

      <TreasuryAccountingCard treasuryState={treasuryState} />

      {connectedAsTreasuryOperator ? <TreasuryPricingCard pricing={pricing} wallet={wallet} /> : <AccountCard title="Pricing" heading="Yearly prices">
        {feeConfigError ? <p>{feeConfigError}</p> : <AccountDetailList>
          {['abc', 'abcd', 'abcde'].map((label, i) => <AccountDetailItem key={label} label={['3 characters', '4 characters', '5+ characters'][i]} value={`${formatDusk(registrationPrice(label, 1, feeConfig))} DUSK`} />)}
        </AccountDetailList>}
      </AccountCard>}

      <TreasuryClaimHistoryCard treasuryState={treasuryState} />
    </AccountViewLayout>
  )
}
