import { abbreviate } from '../../utils/format'
import type { ReferralState } from '../referrals/referralState'
import type { CommitWindow } from './flow/types'
import { pendingReservationStatusCopy } from './registrationCopy'

export function RegistrationPurchaseSummary({
  activeReferral,
  appliedReferral,
  canRegister,
  commitWindow,
  displayName,
  expiryDate,
  feeConfigError,
  networkFee,
  registerSetsPrimary,
  registrationComplete = false,
  registrationFee,
  registrationTargetAddress,
  selectedAddress,
  total,
}: {
  activeReferral: ReferralState | null
  appliedReferral: ReferralState | null
  canRegister: boolean
  commitWindow: CommitWindow
  displayName: string
  expiryDate: string
  feeConfigError: string
  networkFee: number | null
  registerSetsPrimary: boolean
  registrationComplete?: boolean
  registrationFee: number
  registrationTargetAddress: string
  selectedAddress: string
  total: number
}) {
  return (
    <div className="review-list">
      <div>
        <span>Domain</span>
        <strong>{displayName}</strong>
      </div>
      <div>
        <span>Reservation</span>
        <strong>{registrationComplete ? 'Completed' : commitWindow.status === 'ready' ? 'Ready' : pendingReservationStatusCopy(commitWindow.status, commitWindow.waitBlocks)}</strong>
      </div>
      <div>
        <span>Payment</span>
        <strong>{canRegister ? `${registrationFee.toFixed(2)} DUSK` : '-'}</strong>
      </div>
      {feeConfigError ? (
        <div>
          <span>Pricing</span>
          <strong>Default</strong>
        </div>
      ) : null}
      <div>
        <span>Network fee</span>
        <strong>{networkFee !== null ? `~${networkFee.toFixed(6)} DUSK` : 'Shown in wallet for each transaction'}</strong>
      </div>
      <div>
        <span>Subtotal (excludes network fees)</span>
        <strong>{canRegister ? `${total.toFixed(2)} DUSK` : '-'}</strong>
      </div>
      <div>
        <span>Owner wallet</span>
        <strong>{selectedAddress ? abbreviate(selectedAddress) : '-'}</strong>
      </div>
      <div>
        <span>Address</span>
        <strong>{registrationTargetAddress ? abbreviate(registrationTargetAddress) : '-'}</strong>
      </div>
      <div>
        <span>Primary</span>
        <strong>{selectedAddress && registerSetsPrimary ? 'Set' : 'Skip'}</strong>
      </div>
      <div>
        <span>Estimated expiry</span>
        <strong>{canRegister ? expiryDate : '-'}</strong>
      </div>
      {activeReferral ? (
        <div>
          <span>Referral</span>
          <strong>{appliedReferral ? abbreviate(activeReferral.input) : 'Saved'}</strong>
        </div>
      ) : null}
      {activeReferral ? (
        <div>
          <span>Buyer fee</span>
          <strong>No extra fee</strong>
        </div>
      ) : null}
    </div>
  )
}
