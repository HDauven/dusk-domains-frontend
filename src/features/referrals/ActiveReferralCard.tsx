import { Button } from '../../components/ui/Button'
import { AddressChip } from '../../components/ui/AddressChip'
import { AccountCard } from '../../components/ui/AccountCard'
import type { ReferralState } from './referralState'

export function ActiveReferralCard({ referral, onClear }: { referral: ReferralState; onClear: () => void }) {
  if (!referral.input) return null
  if (!referral.valid) return referral.reason ? <p className="secure-note">{referral.reason}</p> : null
  return <AccountCard title="Referral" heading="Referred by">
    <AddressChip value={referral.input} />
    <Button variant="quiet" onClick={onClear}>Remove referral</Button>
  </AccountCard>
}
